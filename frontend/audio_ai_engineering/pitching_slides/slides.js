/* Editable slide copy and structure. No build step or network dependencies. */
const arrow = (id, color) => `<defs><marker id="${id}" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 Z" fill="${color}"/></marker></defs>`;
const svgText = (x, y, text, className = 'diagram-text') => `<text x="${x}" y="${y}" class="${className}">${text}</text>`;
const node = (x, y, w, h, title, subtitle, dark = false) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" class="${dark ? 'diagram-node-dark' : 'diagram-node'}"/>${svgText(x+w/2,y+45,title,`diagram-text ${dark ? 'diagram-text-white' : ''}`)}${subtitle ? svgText(x+w/2,y+82,subtitle,`diagram-label ${dark ? 'diagram-label-white' : ''}`) : ''}`;

const visitorWorkflow = `<svg class="journey-diagram" viewBox="0 0 1432 450" role="img" aria-label="Luồng đề xuất: QR mở web, khách chọn camera hoặc danh mục 3D, rồi khám phá hiện vật và nội dung">
  ${arrow('journey-arrow','#86602e')}
  <g class="diagram-edge" marker-end="url(#journey-arrow)">
    <path d="M220,224 H300"/><path d="M500,224 H570 V94 H645"/><path d="M570,224 V354 H645"/>
    <path d="M885,94 H954 V224 H1025"/><path d="M885,354 H954 V224"/>
  </g>
  ${node(0,169,220,110,'Quét QR','Điểm vào dự kiến')}
  ${node(300,169,200,110,'Mở web','Trên trình duyệt')}
  ${node(645,39,240,110,'Chế độ camera','Khi khách cho phép')}
  ${node(645,299,240,110,'Danh mục 3D','Không cần camera')}
  ${node(1025,169,405,110,'Khám phá hiện vật','Câu chuyện · audio · đố vui')}
  ${svgText(765,225,'Khách chọn cách bắt đầu','diagram-label')}
</svg>`;

const systemWorkflow = `<svg class="workflow-diagram" viewBox="0 0 1432 490" role="img" aria-label="Kiến trúc đề xuất: tư liệu vào AI biên soạn, tạo media, người duyệt phê duyệt, xuất tệp lên kho CDN và khách truy cập bằng web">
  ${arrow('system-arrow','#dcb779')}
  <g fill="none" stroke="#dcb779" stroke-width="3" marker-end="url(#system-arrow)">
    <path d="M250,120 H325"/><path d="M575,120 H650"/><path d="M965,120 H1045"/>
    <path d="M1235,175 V255 H175 V330"/><path d="M345,390 H440"/><path d="M770,390 H865"/><path d="M1135,390 H1210"/>
  </g>
  ${node(0,65,250,110,'Ảnh + tư liệu','Tư liệu hiện vật',true)}
  ${node(325,65,250,110,'AI soạn kịch bản','Nội dung + ngữ cảnh',true)}
  ${node(650,65,315,110,'Tạo tài nguyên','3D · video · giọng đọc',true)}
  <rect x="1045" y="65" width="380" height="110" rx="6" class="diagram-node-gate"/>
  ${svgText(1235,110,'Người duyệt phê duyệt')}${svgText(1235,147,'Sử liệu · lời dẫn · minh họa','diagram-label')}
  ${node(0,330,345,110,'Xuất bản được duyệt','Tạo gói tài nguyên tĩnh',true)}
  ${node(440,330,330,110,'Kho media / CDN','Phân phối theo phiên bản',true)}
  ${node(865,330,270,110,'Web của khách','3D + audio + tương tác',true)}
  ${node(1210,330,215,110,'Đo thử nghiệm','Phản hồi sử dụng',true)}
  <text x="0" y="28" fill="#dcb779" font-family="Segoe UI,Arial,sans-serif" font-size="23">BIÊN SOẠN &amp; KIỂM DUYỆT</text>
  <text x="440" y="300" fill="#dcb779" font-family="Segoe UI,Arial,sans-serif" font-size="23">XUẤT BẢN &amp; TRẢI NGHIỆM</text>
</svg>`;

const slides = [
 {
  id:'cover', theme:'cover', title:'HeritageXR Studio', section:'HIST 2026', footer:'Nền tảng trải nghiệm di sản trên trình duyệt',
  html:`<img class="cover-art" src="assets/cover-drum.png" alt="Mô hình trống đồng minh họa trong ứng dụng HeritageXR"><div class="brand">HERITAGEXR <em>STUDIO</em></div><div class="cover-copy"><p class="kicker">HIST 2026 · Du lịch &amp; công nghệ</p><h1>Di sản<br><span>được kể lại.</span></h1><p>Khám phá hiện vật bằng 3D,<br>giọng kể Việt/Anh và âm thanh 360°.</p><span class="cover-tag">MỞ WEB · BƯỚC VÀO CÂU CHUYỆN</span></div>`,
  notes:'Mở bằng trải nghiệm: một hiện vật không chỉ có tên và niên đại; nó có những câu chuyện để khách chủ động khám phá. Giới thiệu HeritageXR Studio là hướng phát triển nền tảng web, với demo hiện tại về mô hình 3D và audio. Trống trên slide là mô hình minh họa của ứng dụng, không phải bản quét hiện vật.',
  sources:['HistPlan.md: PART 1, PART 3','frontend/src/InteractiveScene.tsx','assets/cover-drum.png: ảnh chụp canvas từ bản demo cục bộ']
 },
 {
  id:'problem', theme:'light', section:'Vấn đề', title:'Một hiện vật có nhiều điều để kể.', footer:'Giả thuyết nhu cầu · cần kiểm chứng tại điểm trưng bày',
  html:`<p class="kicker">01 / Bối cảnh</p><h2>Một hiện vật có nhiều điều để kể.</h2><div class="content split"><div><p class="problem-claim">Làm sao để khách<br><span>muốn nghe thêm?</span></p><p class="problem-note">Thiết kế trải nghiệm quanh hiện vật, rồi đo xem khách có thực sự sử dụng.</p></div><ol class="problem-list"><li><b>01</b><div><strong>Nội dung khó tiếp cận</strong><p>Khách cần cách nghe, nhìn và tìm hiểu phù hợp với mình.</p></div></li><li><b>02</b><div><strong>Câu chuyện thiếu kết nối</strong><p>Thông tin, hình ảnh và tương tác cần đi cùng một mạch kể.</p></div></li><li><b>03</b><div><strong>Chi phí biên soạn nội dung</strong><p>Đơn vị trưng bày cần tái sử dụng tài nguyên đã được duyệt.</p></div></li></ol></div>`,
  notes:'Các vấn đề này là giả thuyết thiết kế từ kế hoạch, chưa phải kết quả khảo sát khách hoặc bảo tàng. Không trình bày các mốc 15 phút hay 56 phút trong kế hoạch như số liệu đã đo. Chuyển sang giải pháp bằng câu hỏi: một đường dẫn web có thể gắn các lớp nội dung lại với nhau như thế nào?',
  sources:['HistPlan.md: PART 1 — The Problem; PART 2 — Generate Once, Serve Millions']
 },
 {
  id:'solution', theme:'', section:'Giải pháp', title:'Một đường dẫn, nhiều lớp khám phá.', footer:'Ảnh chụp từ bản demo hiện tại · mô hình minh họa',
  html:`<p class="kicker">02 / Giải pháp</p><h2>Một đường dẫn, nhiều lớp khám phá.</h2><div class="split content"><div class="solution-copy"><h3>Khách tự chọn nhịp trải nghiệm.</h3><p>Xem cấu tạo hiện vật, nghe lời dẫn và tương tác trong cùng một ứng dụng web.</p><div class="rule"></div><p class="small muted">Định hướng zero-app: đưa nội dung đến trình duyệt, giảm bước cài đặt ứng dụng riêng.</p></div><div class="phone-strip"><figure class="phone-example"><img src="assets/mobile-object.png" alt="Màn hình khám phá hiện vật"><figcaption>Nhìn kỹ</figcaption></figure><figure class="phone-example"><img src="assets/mobile-story.png" alt="Màn hình câu chuyện và thuyết minh"><figcaption>Nghe kể</figcaption></figure><figure class="phone-example"><img src="assets/mobile-spatial.png" alt="Màn hình âm thanh 360 độ"><figcaption>Nhập vai</figcaption></figure></div></div>`,
  notes:'Ba hình đều là ảnh chụp trực tiếp từ frontend đang chạy. Luồng hiện tại chọn hiện vật qua hotspot; quét QR và tracking WebAR là định hướng cần tích hợp thêm. Không gọi bản demo hiện tại là hệ thống WebAR tracking đã hoàn thiện.',
  sources:['HistPlan.md: PART 2, PART 3','frontend/src/App.tsx','assets/mobile-object.png; mobile-story.png; mobile-spatial.png: ảnh chụp bản demo']
 },
 {
  id:'visitor-flow', theme:'light', section:'Workflow trải nghiệm', title:'Khách luôn có một cách để bắt đầu.', footer:'Luồng sản phẩm đề xuất · QR/tracking cần tích hợp thêm',
  html:`<p class="kicker">03 / Hành trình khách</p><h2>Khách luôn có một cách để bắt đầu.</h2><p class="muted">Camera là lựa chọn. Danh mục 3D giữ trải nghiệm tiếp tục khi khách không có camera.</p>${visitorWorkflow}<p class="diagram-note">Bản demo đã kiểm tra: không có camera hoặc bị từ chối quyền vẫn xem 3D và nghe audio được.</p>`,
  notes:'Đọc sơ đồ từ trái sang phải. QR là điểm vào theo kiến trúc đề xuất. Nhánh camera chỉ được mở khi khách đồng ý; nhánh danh mục 3D phục vụ cả người không có camera. Điểm đã kiểm tra trong repo là camera tùy chọn, mô hình 3D và audio không bị chặn khi thiếu camera; chưa kiểm chứng tracking WebAR ngoài thực địa.',
  sources:['HistPlan.md: PART 2 — One-Scan Universal Pass; PART 3','frontend/src/CameraPassthrough.tsx','frontend/audio_ai_engineering/TEST_RESULTS.md']
 },
 {
  id:'evidence', theme:'', section:'Bản demo', title:'Đã có phần để nhìn và nghe.', footer:'Kết quả demo cục bộ · chưa phải số liệu triển khai thực tế',
  html:`<p class="kicker">04 / Bằng chứng sản phẩm</p><h2>Đã có phần để nhìn và nghe.</h2><div class="split content"><div class="evidence-copy"><div class="evidence-metrics"><div><strong class="number">3</strong><p>hiện vật minh họa</p></div><div><strong class="number">6</strong><p>bản thu MP3</p></div><div><strong class="number">2</strong><p>ngôn ngữ Việt/Anh</p></div></div><div class="rule"></div><p>Mô hình tương tác, thuyết minh và âm thanh môi trường đã nối vào cùng frontend.</p><p class="small">Đã kiểm tra trên Chrome, gồm các trường hợp thiếu camera. Cảm biến được mô phỏng; cần thử tiếp trên điện thoại thật.</p></div><img class="evidence-photo" src="assets/proof-narration.png" alt="Trình phát thuyết minh tiếng Anh trong bản demo"></div>`,
  notes:'Ba hiện vật là trống Ngọc Lũ, thạp Đào Thịnh và loại hình dao găm Đông Sơn. Sáu MP3 được tạo bằng KorvaTTS cục bộ, giọng ngoc_huyen; không phải giọng Oanh. ElevenLabs đã có công cụ tích hợp nhưng việc dùng voice library qua API bị giới hạn ở tài khoản hiện tại. Không tuyên bố đã chạy toàn bộ pipeline AI hay đã đo tải người dùng thực tế.',
  sources:['frontend/src/exhibitStories.ts','frontend/public/narration/*.json','frontend/audio_ai_engineering/TEST_RESULTS.md','assets/proof-narration.png: ảnh chụp trình phát thực tế']
 },
 {
  id:'audio', theme:'', section:'Âm thanh 360°', title:'Góc nhìn đổi, không gian lên tiếng.', footer:'Âm thanh tổng hợp minh họa · nên trải nghiệm bằng tai nghe',
  html:`<p class="kicker">05 / Trải nghiệm khác biệt</p><h2>Góc nhìn đổi, không gian lên tiếng.</h2><div class="split content"><div><h3>Ba nguồn âm giữ vị trí trong cảnh.</h3><ul class="feature-list"><li>Trái / phải theo camera<span>HRTF đặt âm thanh trong không gian nghe.</span></li><li>Nhìn về nguồn, âm rõ hơn<span>Điều khiển bằng chuột, thanh góc nhìn hoặc cảm biến.</span></li><li>Lời dẫn giữ ở giữa<span>Âm lượng môi trường điều chỉnh riêng.</span></li></ul></div><img class="audio-image" src="assets/spatial-controls.png" alt="Điều khiển nguồn âm và bản đồ hướng nghe trong ứng dụng"></div>`,
  notes:'Nguồn minh họa gồm lửa lò, tiếng gõ và dòng nước. AudioListener lấy vị trí, vector nhìn và vector lên từ camera Three.js; PannerNode dùng HRTF và GainNode điều chỉnh độ rõ theo hướng. Thử nghiệm tự động đã xác nhận đảo kênh trái/phải khi quay 180 độ, tắt nguồn và dừng khi rời màn hình. Chưa kiểm tra iOS Safari và cảm biến vật lý. Không gọi các âm tổng hợp này là phục dựng âm thanh lịch sử chính xác.',
  sources:['frontend/audio_ai_engineering/spatialAudio.ts','frontend/audio_ai_engineering/SpatialAudioExperience.tsx','frontend/src/InteractiveStructureScene.tsx','frontend/audio_ai_engineering/TEST_RESULTS.md','assets/spatial-controls.png: ảnh chụp giao diện thực tế']
 },
 {
  id:'system-flow', theme:'', section:'Workflow hệ thống', title:'Nội dung đi qua một cổng kiểm duyệt.', footer:'Kiến trúc mục tiêu · tạo một lần, tái sử dụng tài nguyên tĩnh',
  html:`<p class="kicker">06 / Workflow hệ thống</p><h2>Nội dung đi qua một cổng kiểm duyệt.</h2>${systemWorkflow}<p class="workflow-caption">Hiện đã có bước tạo audio và phục vụ MP3 tĩnh. CMS, hàng đợi AI, CDN và đo lường là phần cần triển khai tiếp.</p>`,
  notes:'Đây là sơ đồ kiến trúc đề xuất, không phải sơ đồ mô tả một backend đã chạy đầy đủ. Ảnh và tư liệu do đơn vị trưng bày cung cấp được dùng để soạn kịch bản và tạo media. Người duyệt kiểm tra nội dung trước xuất bản. Hướng dài hạn là tác vụ tạo nội dung bất đồng bộ và phân phối tài nguyên tĩnh theo phiên bản. Không khẳng định không có nghẽn mạng hay chịu được 5.000 người dùng khi chưa benchmark.',
  sources:['HistPlan.md: PART 2 — Curatorial Gate, Generate Once; PART 4; PART 5','frontend/audio_ai_engineering/generate-local-narration.py','frontend/audio_ai_engineering/generate-narration.mjs']
 },
 {
  id:'trust', theme:'light', section:'Niềm tin', title:'Nội dung đáng tin trước khi nhập vai.', footer:'Nguyên tắc nội dung và quyền truy cập',
  html:`<p class="kicker">07 / Vận hành có kiểm soát</p><h2>Nội dung đáng tin trước khi nhập vai.</h2><div class="trust-rows"><div class="trust-row"><span class="index">01</span><h3>Nguồn tư liệu<br>có thể truy vết</h3><p>Liên kết nguồn bảo tàng đi cùng câu chuyện. Mô hình và âm thanh được dán nhãn minh họa.</p></div><div class="trust-row"><span class="index">02</span><h3>Người duyệt<br>giữ quyền xuất bản</h3><p>Kế hoạch yêu cầu kiểm tra sử liệu, lời dẫn và hình ảnh trước khi đưa nội dung đến khách.</p></div><div class="trust-row"><span class="index">03</span><h3>Khách chọn<br>quyền truy cập</h3><p>Camera và cảm biến chỉ bật sau thao tác của khách; vẫn có điều khiển thủ công khi thiếu thiết bị.</p></div></div>`,
  notes:'Các liên kết sử liệu và thông báo mô hình minh họa có trong frontend. Cổng biên tập người duyệt thuộc kiến trúc mục tiêu, chưa có backend CMS. Camera và cảm biến cần quyền; bản demo có xử lý từ chối quyền. Không tuyên bố loại bỏ hoàn toàn sai lệch lịch sử hoặc rủi ro riêng tư.',
  sources:['frontend/src/exhibitInformation.ts','frontend/src/exhibitStories.ts','frontend/src/CameraPassthrough.tsx','frontend/audio_ai_engineering/SpatialAudioExperience.tsx','HistPlan.md: PART 2 — Curatorial Gate']
 },
 {
  id:'business', theme:'light', section:'Mô hình kinh doanh', title:'Giá trị cho điểm đến và khách tham quan.', footer:'Mô hình và giá dự kiến trong kế hoạch · chưa kiểm chứng doanh thu',
  html:`<p class="kicker">08 / Mô hình B2B2C đề xuất</p><h2>Giá trị cho điểm đến và khách tham quan.</h2><div class="commercial"><div><span class="eyebrow">Đơn vị trưng bày</span><h3>Khởi tạo &amp; duy trì<br>nội dung số.</h3><p class="small">Đề xuất thương mại hóa qua phí thiết lập trải nghiệm và gói duy trì nội dung. Mức phí cần kiểm chứng với đối tác thử nghiệm.</p><div class="rule"></div><p class="small">Khách hàng mục tiêu: bảo tàng, không gian di sản và đơn vị vận hành điểm đến.</p></div><div><span class="eyebrow">Dịch vụ bổ sung cho khách</span><div class="revenue-lines"><div class="price-row"><strong>30k</strong><p>Ảnh số HD<br><span class="micro muted">Giá dự kiến / ảnh</span></p></div><div class="price-row"><strong>50k</strong><p>Gói ảnh in lụa<br><span class="micro muted">Giá dự kiến / gói</span></p></div></div><p class="business-note">Cần thử nhu cầu mua, chi phí in và phần chia sẻ doanh thu với đối tác.</p></div></div>`,
  notes:'B2B2C là định hướng của master plan. Giá 30.000 đồng cho ảnh số và 50.000 đồng cho gói in lụa lấy từ kế hoạch, chưa phải giá đã bán hoặc kết quả khảo sát. Không sử dụng tỷ lệ margin 98%/45% hoặc affiliate 20% như số liệu đã kiểm chứng. Cấu trúc phí khởi tạo và duy trì là đề xuất pitching để thảo luận, chưa có báo giá. Luồng thanh toán/POS/photo chưa triển khai trong repo hiện tại.',
  sources:['HistPlan.md: PART 1 — B2B2C; PART 3 — Commerce; PART 4']
 },
 {
  id:'pilot', theme:'', section:'Thử nghiệm', title:'Một điểm đến. Ba hiện vật. Một thử nghiệm.', footer:'Đề xuất thử nghiệm 4 tuần · điều chỉnh theo đối tác',
  html:`<p class="kicker">09 / Bước thử nghiệm tiếp theo</p><h2 class="pilot-title">Một điểm đến. Ba hiện vật.<br>Một thử nghiệm.</h2><div class="pilot-plan"><div class="pilot-week"><span>TUẦN 01</span><h3>Duyệt câu chuyện</h3><p>Chọn hiện vật và thống nhất nguồn tư liệu với người phụ trách.</p></div><div class="pilot-week"><span>TUẦN 02</span><h3>Thử thiết bị thật</h3><p>Kiểm tra audio, cảm biến, mạng và khả năng truy cập.</p></div><div class="pilot-week"><span>TUẦN 03</span><h3>Quan sát khách</h3><p>Theo dõi hành trình sử dụng và ghi nhận phản hồi.</p></div><div class="pilot-week"><span>TUẦN 04</span><h3>Đánh giá &amp; sửa</h3><p>Quyết định cải tiến, mở rộng hoặc thay cách triển khai.</p></div></div><div class="pilot-measures"><span>Đo thời gian khám phá</span><span>·</span><span>Đo tỷ lệ hoàn thành</span><span>·</span><span>Đánh giá khả năng vận hành</span></div>`,
  notes:'Đây là lịch thử nghiệm do deck đề xuất, không phải cam kết hoặc lịch đã được đối tác chấp thuận. Bắt đầu nhỏ để đánh giá giá trị sử dụng thay vì khẳng định mục tiêu 56 phút đã đạt. Cần định nghĩa mốc bắt đầu/kết thúc phiên, có sự đồng ý phù hợp cho quan sát và không suy diễn chỉ số từ số người truy cập.',
  sources:['Đề xuất pilot phục vụ pitching, xây dựng từ phạm vi demo và các giới hạn trong frontend/audio_ai_engineering/TEST_RESULTS.md','HistPlan.md: PART 1, PART 3']
 },
 {
  id:'roadmap', theme:'light', section:'Lộ trình', title:'Bước tiếp theo tập trung vào vận hành.', footer:'Trạng thái đối chiếu từ mã nguồn và kế hoạch',
  html:`<p class="kicker">10 / Lộ trình sản phẩm</p><h2>Bước tiếp theo tập trung vào vận hành.</h2><div class="roadmap"><div class="roadmap-row"><h3>Bản demo</h3><p>3D minh họa · audio Việt/Anh<br>Âm thanh 360° · kiểm tra không có camera</p><span class="stage-label">Đã có</span></div><div class="roadmap-row"><h3>Kiểm chứng thực địa</h3><p>Thiết bị thật · iOS Safari<br>Chất lượng lời dẫn · mạng tại điểm đến</p><span class="stage-label">Ưu tiên kế tiếp</span></div><div class="roadmap-row"><h3>Vận hành nội dung</h3><p>QR / tracking · CMS kiểm duyệt<br>RAG · hàng đợi media · CDN</p><span class="stage-label">Theo kế hoạch</span></div><div class="roadmap-row"><h3>Thử mô hình thu</h3><p>Ảnh lưu niệm · đối tác dịch vụ<br>Thanh toán và đối soát</p><span class="stage-label">Cần thử nghiệm</span></div></div><p class="roadmap-note">Mở rộng sau khi nội dung, trải nghiệm và quy trình vận hành được kiểm chứng.</p>`,
  notes:'Giữ đúng trạng thái: demo frontend và audio là phần có mã chạy và kiểm tra; kiểm thử sensor đã dùng mô phỏng. Không gộp RAG, tracking, CMS hoặc commerce vào các tính năng đã hoàn thành. Các mốc triển khai tiếp theo cần chia việc và ưu tiên với nhóm, chưa có deadline hoặc ngân sách được xác nhận.',
  sources:['frontend/src/App.tsx','frontend/audio_ai_engineering/TEST_RESULTS.md','HistPlan.md: PART 2, PART 4, PART 5']
 },
 {
  id:'closing', theme:'', section:'Lời mời', title:'Cùng đưa di sản vào một trải nghiệm có thể đo.', footer:'HERITAGEXR STUDIO · HIST 2026',
  html:`<div class="brand">HERITAGEXR <em>STUDIO</em></div><img class="closing-art" src="assets/closing-dagger.png" alt="Mô hình dao găm Đông Sơn minh họa trong demo"><div class="closing-content"><p class="kicker">Lời mời hợp tác thử nghiệm</p><h2>Cùng đưa di sản vào<br>một trải nghiệm<br><span class="gold">có thể đo.</span></h2><p>Chọn ba hiện vật, duyệt câu chuyện<br>và quan sát khách sử dụng tại một điểm đến.</p><p class="closing-ask">Tìm đối tác trưng bày và người phụ trách nội dung<br>để cùng thiết kế một pilot thực tế.</p></div>`,
  notes:'Kết lại bằng đề nghị cụ thể: một đối tác trưng bày và người phụ trách tư liệu cùng tham gia thiết kế pilot. Không đưa số tiền gọi vốn, số người dùng, đối tác, danh sách thành viên hoặc kết quả thị trường khi chưa được cung cấp. Nếu hỏi về demo, chuyển sang ứng dụng ở máy trình bày và mở Âm thanh 360 độ; dùng tai nghe để cảm nhận stereo.',
  sources:['Đề nghị hợp tác được xây dựng cho deck từ HistPlan.md và phạm vi demo','assets/closing-dagger.png: ảnh chụp mô hình minh họa từ frontend']
 }
];

window.pitchSlides = slides;
const stage = document.getElementById('stage');
const escapeHTML = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
stage.innerHTML = slides.map((slide,index) => `<section class="slide ${slide.theme}" data-index="${index}" aria-label="Slide ${index+1}: ${escapeHTML(slide.title)}"><div class="slide-body">${slide.html}</div><footer class="footer"><span>${slide.footer}</span><span>${String(index+1).padStart(2,'0')} / ${slides.length}</span></footer></section>`).join('');

let current = Math.max(0, Math.min(slides.length-1, Number(location.hash.slice(1)||1)-1));
if (!Number.isFinite(current)) current = 0;
const notes = document.getElementById('notes');
function show(index) {
 current = Math.max(0,Math.min(slides.length-1,index));
 document.querySelectorAll('.slide').forEach((slide,i) => { slide.classList.toggle('active',i===current); slide.setAttribute('aria-hidden',String(i!==current)); });
 document.getElementById('counter').textContent = `${current+1} / ${slides.length}`;
 document.getElementById('previous').disabled = current === 0;
 document.getElementById('next').disabled = current === slides.length-1;
 const slide = slides[current];
 notes.innerHTML = `<h3>${escapeHTML(slide.title)}</h3><p>${escapeHTML(slide.notes)}</p><div class="sources"><strong>[Sources]</strong><ul>${slide.sources.map(source=>`<li>${escapeHTML(source)}</li>`).join('')}</ul></div>`;
 history.replaceState(null,'',`#${current+1}`);
 document.title = `HeritageXR Studio — ${current+1}/${slides.length} — ${slide.section}`;
}
function resize() {
 const scale = Math.min(innerWidth/1600,Math.max(100,innerHeight-66)/900);
 document.documentElement.style.setProperty('--scale',String(scale));
}
document.getElementById('previous').addEventListener('click',()=>show(current-1));
document.getElementById('next').addEventListener('click',()=>show(current+1));
document.getElementById('notes-toggle').addEventListener('click',event=>{notes.hidden=!notes.hidden;event.currentTarget.setAttribute('aria-pressed',String(!notes.hidden));});
document.getElementById('fullscreen').addEventListener('click',async()=>{try {if(document.fullscreenElement) await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{}});
document.getElementById('print').addEventListener('click',()=>window.print());
document.addEventListener('keydown',event=>{
 if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
 if(['ArrowRight','PageDown',' '].includes(event.key)){event.preventDefault();show(current+1);}
 if(['ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();show(current-1);}
 if(event.key==='Home'){event.preventDefault();show(0);}
 if(event.key==='End'){event.preventDefault();show(slides.length-1);}
 if(event.key.toLowerCase()==='n')document.getElementById('notes-toggle').click();
 if(event.key==='Escape'&&!notes.hidden){notes.hidden=true;document.getElementById('notes-toggle').setAttribute('aria-pressed','false');}
});
let touchStart = null;
stage.addEventListener('touchstart',event=>{touchStart=event.touches[0].clientX;},{passive:true});
stage.addEventListener('touchend',event=>{if(touchStart!==null){const delta=event.changedTouches[0].clientX-touchStart;if(Math.abs(delta)>60)show(current+(delta<0?1:-1));touchStart=null;}},{passive:true});
window.addEventListener('resize',resize);
show(current);resize();
