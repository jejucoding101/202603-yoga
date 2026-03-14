const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxjDEMolRhAczP-YQmqZocu38i0XHbPAcbloio4-DL_5xg6rDTQpIW9S8YhbiqkBQ8M/exec";

// 공통 API 통신 함수
async function fetchAPI(action, payload = {}) {
    try {
        const response = await fetch(`${GAS_WEB_APP_URL}?action=${action}`, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error(`[에러 - ${action}]`, error);
        return { success: false, message: error.message };
    }
}

// 대기 함수 (Rate Limit 우회 및 사람처럼 보이게 하기 위함)
const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function main() {
    console.log("🚀 [테스트 모드 1] 20명 회원 일괄 가입 시작...");
    const users = [];
    const TOTAL_USERS = 20;

    const testNames = [
        "김민준", "이서준", "박도윤", "최예준", "정시우",
        "강하준", "조지호", "윤서진", "장현우", "임지안",
        "지서아", "하윤서", "오지유", "송하은", "신수아",
        "안지민", "서지우", 
        "John Doe", "Jane Smith", "Michael Brown"
    ];

    for (let i = 1; i <= TOTAL_USERS; i++) {
        const email = `testuser${i}@yoga.com`;
        const password = 'password123';
        const name = testNames[i-1] || `테스트회원${i}`;
        const phone = `010-1234-${i.toString().padStart(4, '0')}`;
        
        console.log(`⏳ 가입 시도 중: ${email}...`);
        
        const res = await fetchAPI('register', { email, password, name, phone });
        
        if (res.success || res.message === '이미 가입된 이메일입니다.') {
            console.log(`✅ 가입 성공 (또는 이미 존재): ${email}`);
            users.push({ email, password });
        } else {
            console.log(`❌ 가입 실패: ${email} - ${res.message}`);
        }
        
        // GAS rate limit 방지를 위해 1초 대기
        await delay(1000);
    }
    
    console.log(`\n🎉 총 ${users.length}명의 테스트용 회원이 준비되었습니다.`);
    console.log("=================================================");
    console.log("🚀 [테스트 모드 2] 랜덤 로그인/로그아웃 루프 시작...");
    console.log("종료하려면 Ctrl + C 를 눌러주세요.\n");
    
    // 무한 루프로 랜덤하게 로그인 처리를 수행합니다.
    let loopCount = 1;
    while (true) {
        // 랜덤한 유저 한 명 선택
        const randomUser = users[Math.floor(Math.random() * users.length)];
        
        console.log(`[루프 #${loopCount}] 👤 ${randomUser.email} 계정 로그인 시도 중...`);
        const res = await fetchAPI('login', { email: randomUser.email, password: randomUser.password });
        
        if (res.success) {
            console.log(`   ✅ 로그인 성공! (서버 DB에 로그인 카운트 +1)`);
            console.log(`   🔄 '로그아웃' 처리 (프론트 단에서 세션 종료와 동일한 동작)`);
        } else {
            console.log(`   ❌ 로그인 실패: ${res.message}`);
        }
        
        // 다음 로그인 시도 전까지 랜덤하게 3초 ~ 7초 대기
        const randomDelay = Math.floor(Math.random() * 4000) + 3000;
        console.log(`   ⏳ 다음 시도까지 ${randomDelay/1000}초 대기 중...\n`);
        await delay(randomDelay);
        loopCount++;
    }
}

main();
