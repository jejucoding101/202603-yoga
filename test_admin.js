const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx7b5QXThfgqkOcBfHwAx6x7h4B4FhnrGeuT6v8SqRIdkOcbZXe2N4qtFRYNgz45EQh/exec";

async function fetchAPI(action, payload = {}) {
    try {
        const getActions = ['getClasses', 'getUserDashboard', 'adminGetUsers', 'adminGetDashboard', 'adminGetBookings', 'adminGetAllClasses'];
        const method = getActions.includes(action) ? 'GET' : 'POST';
        let url = `${GAS_WEB_APP_URL}?action=${action}`;
        const options = { method, headers: { 'Content-Type': 'text/plain;charset=utf-8' } };
        
        if (method === 'GET' && Object.keys(payload).length > 0) {
            for (const key in payload) {
                url += `&${key}=${encodeURIComponent(payload[key])}`;
            }
        } else if (method === 'POST') {
            options.body = JSON.stringify(payload);
        }
        const response = await fetch(url, options);
        return await response.json();
    } catch (error) {
        return { success: false, message: error.message };
    }
}

const delay = (ms) => new Promise(res => setTimeout(res, ms));

function getFormattedDate(addDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + addDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

async function runAdminSetup() {
    console.log("=========================================================");
    console.log(" 🧘‍♀️ [Admin Setup] 테스트 기초 데이터 세팅 스크립트");
    console.log("=========================================================\n");

    console.log("▶ [STEP 1] 관리자 권한 획득");
    const adminEmail = 'jejucoding101@gmail.com';
    let adminRes = await fetchAPI('login', { email: adminEmail, password: '1234' });
    if (!adminRes.success) {
        console.log("   ❌ 로그인 실패. 환경을 다시 확인하세요.");
        return;
    }
    console.log("   ✅ 관리자 로그인 완료");

    console.log("\n▶ [STEP 2] 20명 회원 수강권 일괄 지급");
    const usersRes = await fetchAPI('adminGetUsers');
    if(!usersRes.success) return console.log("   ❌ 회원 조회 실패");
    
    let allUsers = usersRes.data.filter(u => u.role === 'member' || u.email.startsWith('testuser')).slice(0, 20);
    console.log(`   🔸 총 ${allUsers.length}명의 대상 발견`);
    
    let passCount = 0;
    for (const u of allUsers) {
        const grantRes = await fetchAPI('adminGrantPass', { 
            user_id: u.user_id, pass_type: 'Monthly Unlimited', count: 30, days_valid: 30 
        });
        if(grantRes.success) passCount++;
        await delay(500); 
    }
    console.log(`   ✅ ${passCount}/${allUsers.length} 명에게 수강권 발급 완료`);

    console.log("\n▶ [STEP 3] 향후 10일간 15개 수업 여러 시간대에 개설");
    const classNames = ["하타 요가 기초", "아쉬탕가 빈야사", "릴렉스 명상", "인사이드 플로우", "코어 강화 다이어트 요가"];
    const instructors = ["김서연", "박준호", "이하늘"];
    let classCreatedCount = 0;

    for (let i = 0; i < 15; i++) {
        const cName = classNames[Math.floor(Math.random() * classNames.length)];
        const inst = instructors[Math.floor(Math.random() * instructors.length)];
        const dayOffset = Math.floor(Math.random() * 10); // 0 ~ 9일 후
        const dateStr = getFormattedDate(dayOffset);
        const hour = String(Math.floor(Math.random() * 12) + 9).padStart(2, '0');
        
        const createRes = await fetchAPI('adminCreateClass', { 
            instructor: inst, class_name: cName, date: dateStr, time: `${hour}:00`, capacity: Math.floor(Math.random() * 5) + 5 
        });
        if(createRes.success) {
            console.log(`   - 개설: ${dateStr} ${hour}:00 [${cName}]`);
            classCreatedCount++;
        }
        await delay(500);
    }
    console.log(`   ✅ ${classCreatedCount}개 다채로운 수업 개설 완료\n`);
    console.log("🎉 어드민 기초 데이터 셋업을 완료했습니다! 이어서 test_user.js를 실행해보세요.");
}

runAdminSetup();
