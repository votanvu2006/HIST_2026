"""Check that the main museum chat rejects an unrelated measurement in the UI."""
import asyncio
import json

from playwright.async_api import async_playwright, expect


async def main(url):
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(channel="msedge", headless=True, args=[
            "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        page = await browser.new_page(viewport={"width": 1440, "height": 1000})
        requests = []
        page.on("request", lambda request: requests.append(request.post_data_json)
                if request.url.endswith("/api/chat") and request.method == "POST" else None)
        await page.goto(url, wait_until="domcontentloaded")
        health = await page.request.get(url + "/api/health")
        data = await health.json()
        assert health.status == 200 and data["service_version"] == "2026.11.05-dialogue.5"
        await page.get_by_role("button", name="Chọn Trống đồng Ngọc Lũ", exact=True).dispatch_event("click")
        await page.get_by_role("button", name="✦ Hỏi AI", exact=True).click()
        field = page.get_by_label("Câu hỏi của bạn")
        await field.fill("voi cao bao nhieu")
        await field.press("Enter")
        refusal = page.locator(".chat-message.is-assistant").last
        await expect(refusal).to_contain_text("đối tượng khác", timeout=5000)
        await expect(refusal).not_to_contain_text("63 cm")
        assert requests and requests[-1]["question"] == "voi cao bao nhieu"
        assert requests[-1]["artifact_id"] == "drum"
        print(json.dumps({"service_version": data["service_version"],
                          "question": requests[-1]["question"],
                          "status": "out_of_scope", "leaked_drum_measurement": False,
                          "ui": "passed"}, ensure_ascii=True))
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main("http://127.0.0.1:5275"))
