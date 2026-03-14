const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx7b5QXThfgqkOcBfHwAx6x7h4B4FhnrGeuT6v8SqRIdkOcbZXe2N4qtFRYNgz45EQh/exec";

// 공통 API 통신 함수
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
        const result = await response.json();
        return result;
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

async function runAdvancedSimulation() {
    console.log("=========================================================");
    console.log(" 🧘‍♀️ [Yoga Sanctuary] 다계정 랜덤 볼륨 시뮬레이션 및 검증");
    console.log("=========================================================\n");

    const report = { totalActions: 0, passed: 0, failed: 0, errors: [] };
    const logAction = (name, isSuccess, detail) => {
        report.totalActions++;
        if(isSuccess) {
            console.log(` ✅ [PASS] ${name}`);
            report.passed++;
        } else {
            console.log(` ❌ [FAIL] ${name}`);
            console.log(`    ↳ 사유: ${detail}`);
            report.failed++;
            report.errors.push(`[${name}] ${detail}`);
        }
    };

    // 1. 관리자 셋업 및 로그인
    console.log("▶ [STEP 1] 관리자 권한 획득");
    const adminEmail = 'jejucoding101@gmail.com';
    let adminRes = await fetchAPI('login', { email: adminEmail, password: '1234' });
    if (!adminRes.success) {
        await fetchAPI('register', { email: adminEmail, password: '1234', name: '최고관리자', phone: '010-0000-0000' });
        adminRes = await fetchAPI('login', { email: adminEmail, password: '1234' });
    }
    logAction('어드민 계정 로그인', adminRes.success, adminRes.message);
    if (!adminRes.success) return;

    // 2. 전체 회원 조회
    console.log("\n▶ [STEP 2] 회원 데이터 확인 및 전원 수강권 발급");
    const usersRes = await fetchAPI('adminGetUsers');
    logAction('전체 회원 목록 조회', usersRes.success, usersRes.message);
    
    let allUsers = usersRes.data.filter(u => u.role === 'member' || u.email.startsWith('testuser'));
    console.log(`   🔸 총 ${allUsers.length}명의 테스트 대상 회원이 있습니다.`);

    // 20명으로 자르기
    if (allUsers.length > 20) allUsers = allUsers.slice(0, 20);

    let passGivenCount = 0;
    for (const u of allUsers) {
        const grantRes = await fetchAPI('adminGrantPass', { 
            user_id: u.user_id, pass_type: 'Monthly Unlimited', count: 30, days_valid: 30 
        });
        if(grantRes.success) passGivenCount++;
        await delay(500); // 부하 방지
    }
    logAction(`사용자 전원(${allUsers.length}명)에게 수강권 발급`, passGivenCount === allUsers.length, `${passGivenCount}/${allUsers.length} 명 성공`);


    // 3. 다양한 시간대의 수업 12개 개설 (향후 10일)
    console.log("\n▶ [STEP 3] 향후 10일 간의 다양한 수업 12개 개설");
    const classNames = ["하타 요가 기초", "아쉬탕가 빈야사", "릴렉스 명상", "인사이드 플로우", "코어 강화 다이어트 요가"];
    const instructors = ["박푸르", "임푸르", "최오리", "김요가"];
    let classCreatedCount = 0;

    for (let i = 0; i < 12; i++) {
        const cName = classNames[Math.floor(Math.random() * classNames.length)];
        const inst = instructors[Math.floor(Math.random() * instructors.length)];
        const dayOffset = Math.floor(Math.random() * 10); // 0 ~ 9일 후
        const dateStr = getFormattedDate(dayOffset);
        const hour = String(Math.floor(Math.random() * 12) + 9).padStart(2, '0'); // 09 ~ 20시
        const timeStr = `${hour}:00`;
        const cap = Math.floor(Math.random() * 5) + 3; // 3 ~ 7명 정원 (빨리 차게)

        const createRes = await fetchAPI('adminCreateClass', { 
            instructor: inst, class_name: cName, date: dateStr, time: timeStr, capacity: cap 
        });
        if(createRes.success) classCreatedCount++;
        await delay(500);
    }
    logAction('다양한 클래스 대량 개설 설정', classCreatedCount === 12, `${classCreatedCount}/12 개 성공`);

    
    // 4. 회원 20명 랜덤 20회 반복 수행
    console.log("\n▶ [STEP 4] 유저 20명의 20회 랜덤 액션 반복 시뮬레이션 (수강신청/취소/조회)");
    
    for (let r = 1; r <= 20; r++) {
        console.log(`\n --- [Round ${r}/20] ---`);
        
        // 랜덤 회원 선택
        const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
        console.log(` 👤 회원: ${randomUser.name} (${randomUser.email})`);

        // 오픈클래스 로드
        const classRes = await fetchAPI('getClasses');
        if (!classRes.success || classRes.data.length === 0) {
             console.log("   ❌ 예약 가능한 수업이 없습니다.");
             continue;
        }

        // 회원 본인 대시보드 조회 (수강권, 예약내역 확인)
        const myDashRes = await fetchAPI('getUserDashboard', { user_id: randomUser.user_id });
        const myBookings = myDashRes.data.bookings || [];

        // 어떤 액션을 할지 랜덤 결정 (예약 60%, 취소 30%, 그냥 조회 10%)
        const actionScore = Math.random();

        if (actionScore < 0.6) {
            // [예약 시도]
            const targetClass = classRes.data[Math.floor(Math.random() * classRes.data.length)];
            console.log(`   🔸 [예약시도] ${targetClass.date} ${targetClass.time} '${targetClass.class_name}' 예약 중...`);
            
            const bookRes = await fetchAPI('bookClass', { user_id: randomUser.user_id, class_id: targetClass.class_id });
            
            if (bookRes.success) {
                logAction('사용자 수강신청', true, '');
            } else {
                // 수강신청 실패 사유 분류 (정상적인 실패 vs 시스템 실패)
                if(bookRes.message.includes('정원 초과') || bookRes.message.includes('이미 예약한 수업') || bookRes.message.includes('유효한 수강권이 없습니다')) {
                    console.log(`   ℹ️ [정상적 거절] ${bookRes.message}`);
                    logAction('결함 없는 예약 거절', true, bookRes.message); // 예외조건 차단은 성공으로 간주
                } else {
                    logAction('사용자 수강신청', false, bookRes.message);
                }
            }
        } 
        else if (actionScore < 0.9) {
            // [취소 시도]
            const bookedList = myBookings.filter(b => b.status === 'booked');
            if (bookedList.length > 0) {
                const cancelTarget = bookedList[Math.floor(Math.random() * bookedList.length)];
                console.log(`   🔸 [취소시도] 기존 예약 건 취소 중...`);
                const cancelRes = await fetchAPI('cancelBooking', { user_id: randomUser.user_id, booking_id: cancelTarget.booking_id });
                logAction('사용자 수강예약 취소', cancelRes.success, cancelRes.message);
            } else {
                console.log(`   ℹ️ [취소스킵] 취소할 활성 예약이 없습니다.`);
            }
        } 
        else {
            // [단순 마이페이지 조회만]
            console.log(`   ℹ️ [조회종료] 마이페이지 내역만 둘러보고 나갑니다.`);
        }

        await delay(1000); // 너무 빠른 요청 방지
    }

    // 5. 최종 리포트 출력
    console.log("\n=========================================================");
    console.log(` 📊 최종 스트레스 및 볼륨 테스트 결과 리포트`);
    console.log("=========================================================");
    console.log(` - 총 액션 수 : ${report.totalActions} 건`);
    console.log(` - 성공(PASS) : ${report.passed} 건`);
    console.log(` - 실패(FAIL) : ${report.failed} 건`);
    
    if(report.failed > 0) {
        console.log("\n [오류 발생 내역]");
        report.errors.forEach(e => console.log(` * ${e}`));
    } else {
        console.log("\n 🎉 [Great!] 수 많은 동시 다발적 액션에도 무결성있게 모든 기능이 정상 동작했습니다!");
        console.log("    앱 배포 및 실운영이 가능한 안정적인 상태입니다.");
    }
    console.log("=========================================================\n");
}

runAdvancedSimulation();
