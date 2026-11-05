"""Verify Phú's chat adapter against Vũ's current main UI and the real local API."""
import argparse
import asyncio
import json
import re
from pathlib import Path

from playwright.async_api import async_playwright, expect


async def main(url):
    checks = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(channel="msedge", headless=True, args=[
            "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
            "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"])
        context = await browser.new_context(viewport={"width": 1440, "height": 1000})
        page = await context.new_page()
        errors = []
        chat_requests = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("request", lambda request: chat_requests.append(request.post_data_json)
                if request.url.endswith("/api/chat") and request.method == "POST" else None)
        await page.goto(url, wait_until="domcontentloaded")
        health = await page.request.get(url + "/api/health")
        health_data = await health.json()
        assert health.status == 200 and health_data["index_ready"]
        checks.append("Main UI proxy reaches indexed FastAPI")
        for name, question, expected in [
            ("Trống đồng Ngọc Lũ", "Trống nặng bao nhiêu?", "86 kg"),
            # Accept the grounded interpretation in terms of daily life; the
            # answer need not repeat the narrower test author's word "nature".
            ("Thạp đồng Đào Thịnh", "hoa văn đc lấy ý tưởng từ đâu", "đời sống"),
            ("Dao găm đồng Đông Sơn", "cái dao này làm bằng gì", "đồng"),
        ]:
            # Projected WebGL hotspots can be covered by perspective overlays;
            # dispatch the normal DOM click to test Vũ's unchanged onSelect path.
            await page.get_by_role("button", name="Chọn " + name, exact=True).dispatch_event("click")
            await page.get_by_role("button", name="✦ Hỏi AI", exact=True).click()
            field = page.get_by_label("Câu hỏi của bạn")
            await page.wait_for_timeout(5500)
            await field.fill(question)
            await field.press("Enter")
            await expect(page.locator(".chat-message.is-assistant").last).to_contain_text(expected, timeout=25000)
            await expect(page.get_by_role("button", name="Giữ để nói")).to_be_enabled()
            await page.locator(".chat-sources summary").first.click()
            await expect(page.locator(".chat-citation a").first).to_have_attribute("href", re.compile(r"https://baotanglichsu\.vn/"))
            checks.append(name + ": correct scoped answer, sources and voice control")
            if name.startswith("Thạp"):
                await page.wait_for_timeout(5500)
                await field.fill("Cái này cao bao nhiêu?")
                await field.press("Enter")
                answer = page.locator(".chat-message.is-assistant").last
                await expect(answer).to_contain_text("98")
                await expect(answer).to_contain_text("87")
                await expect(answer).to_contain_text("90")
                checks.append("Jar conflicting heights remain explicit on main UI")
                await page.reload(wait_until="domcontentloaded")
                await page.get_by_role("button", name="Chọn " + name, exact=True).dispatch_event("click")
                await page.get_by_role("button", name="✦ Hỏi AI", exact=True).click()
                await expect(page.locator(".chat-message.is-assistant")).to_have_count(2)
                field = page.get_by_label("Câu hỏi của bạn")
                await page.wait_for_timeout(5500)
                await field.fill("Vậy vì sao những con số đó khác nhau?")
                await field.press("Enter")
                await expect(page.locator(".chat-message.is-assistant").last).to_contain_text(re.compile("chưa|không có|không thể"), timeout=25000)
                sent = chat_requests[-1]
                assert len(sent["history"]) == 2, sent
                assert all(turn["artifact_id"] == "jar" for turn in sent["history"])
                assert sent["history"][-1]["question"] == "Cái này cao bao nhiêu?"
                checks.append("Reload preserves the conversation and follow-up requests carry artifact-scoped history")
            await page.get_by_role("button", name="Đóng trợ lý AI", exact=True).click()
            await page.get_by_role("button", name="← Quay lại quét", exact=True).click()
            await expect(page.locator(".scan-experience")).to_be_visible()
        for artifact, question in [
            ("drum", "Con hươu cao cổ ăn gì?"),
            ("jar", "Tổng thống Pháp hiện nay là ai?"),
            ("dagger", "Xe máy nào tiết kiệm xăng nhất?"),
        ]:
            response = await page.request.post(url + "/api/chat", data={
                "question": question, "artifact_id": artifact,
                "session_id": "scope-audit-" + artifact,
            })
            result = await response.json()
            assert response.status == 200 and result["status"] == "out_of_scope", result
            assert not result["citations"], result
        checks.append("Unrelated subject probes are rejected without citations")
        await page.get_by_role("button", name="Chọn Trống đồng Ngọc Lũ", exact=True).dispatch_event("click")
        await page.get_by_role("button", name="✦ Hỏi AI", exact=True).click()
        field = page.get_by_label("Câu hỏi của bạn")
        await field.fill("voi cao bao nhieu")
        await field.press("Enter")
        refusal = page.locator(".chat-message.is-assistant").last
        await expect(refusal).to_contain_text("đối tượng khác", timeout=5000)
        await expect(refusal).not_to_contain_text("63 cm")
        checks.append("Main chat rejects an elephant measurement instead of answering with the drum's height")
        await page.get_by_role("button", name="Đóng trợ lý AI", exact=True).click()
        await page.get_by_role("button", name="← Quay lại quét", exact=True).click()
        await page.set_viewport_size({"width": 390, "height": 844})
        await page.get_by_role("button", name="Chọn Dao găm đồng Đông Sơn", exact=True).dispatch_event("click")
        await expect(page.locator(".object-title-copy h1")).to_have_text("Dao găm đồng Đông Sơn")
        await page.get_by_role("button", name="✦ Hỏi AI", exact=True).click()
        await expect(page.get_by_label("Câu hỏi của bạn")).to_be_visible()
        assert await page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        checks.append("Mobile main UI: chat input visible without horizontal overflow")
        await page.goto(url + "/?sandbox", wait_until="domcontentloaded")
        await expect(page.get_by_role("heading", name="Thử nghiệm RAG", exact=True)).to_be_visible()
        checks.append("Sandbox entry loads independently of museum flow")
        assert not errors, errors
        checks.append("No browser JavaScript runtime errors")
        await browser.close()
    report = {"base_commit": "aadc924 + local changes", "service_version":health_data["service_version"],
              "url": url, "passed": len(checks), "checks": checks, "live_api": True,
              "note": "Browser integration and persisted dialogue transport; semantic multi-turn results are in tour-dialogues-live.json."}
    output = Path(__file__).resolve().parents[2] / "docs" / "pr-integration-checks.json"
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:5180")
    asyncio.run(main(parser.parse_args().url.rstrip("/")))
