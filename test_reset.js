const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxjDEMolRhAczP-YQmqZocu38i0XHbPAcbloio4-DL_5xg6rDTQpIW9S8YhbiqkBQ8M/exec";

// API 통신 함수
async function fetchAPI(action, payload = {}) {
    try {
        const response = await fetch(`${GAS_WEB_APP_URL}?action=${action}`, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: error.message };
    }
}

async function runReset() {
    console.log("=========================================================");
    console.log(" 🚨 [DANGER] Yoga Sanctuary 데이터베이스 리셋 스크립트");
    console.log("=========================================================\n");

    const email = 'jejucoding101@gmail.com'; // 최고관리자 계정
    
    // 1. 관리자 1단계: 인증 및 식별
    console.log("▶ 관리자 계정 식별 및 권한 확인 중...");
    const loginRes = await fetchAPI('login', { email, password: '1234' });
    if (!loginRes.success || loginRes.user.role !== 'admin') {
        return console.log(`   ❌ 실패: 관리자 권한(${email})으로 로그인할 수 없습니다.`);
    }

    // 2. 초기화 명령 전송
    console.log(`\n▶ [경고] 정말 DB(Users, Passes, Classes, Bookings)를 초기화하시겠습니까?`);
    console.log(`   - 5초 뒤에 초기화 API 요청을 서버로 전송합니다... (취소: Ctrl+C)`);
    
    await new Promise(res => setTimeout(res, 5000));
    console.log(`\n▶ 초기화 요청 진행 중 (Google Sheets 삭제 중... 약 5~10초 소요)`);

    const resetRes = await fetchAPI('adminResetAllData', { admin_email: email });

    if(resetRes.success) {
        console.log(`\n   ✅ [성공] ${resetRes.message}`);
        console.log(`   🎉 모든 테스트 데이터가 삭제되었으며, 현재 관리자 계정 1개만 남았습니다.`);
    } else {
        console.log(`\n   ❌ [실패] ${resetRes.message}`);
    }
}

runReset();
