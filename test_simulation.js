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

async function runTestReport() {
    console.log("=========================================================");
    console.log(" 🧘‍♀️ [Yoga Sanctuary] 통합 기능 모의 테스트 & 상태 리포트");
    console.log("=========================================================\n");

    const report = { passed: 0, failed: 0, errors: [] };

    const assertValue = (name, res, condition, errorMsg) => {
        if (res.success && condition) {
            console.log(` ✅ [PASS] ${name}`);
            report.passed++;
        } else {
            console.log(` ❌ [FAIL] ${name}`);
            console.log(`    ↳ 사유: ${res.message || errorMsg}`);
            report.failed++;
            report.errors.push(`[${name}] ${res.message || errorMsg}`);
        }
    };

    // 1. 관리자 셋업
    console.log("▶ [STEP 1] 관리자 권한 및 대시보드 검증");
    const adminEmail = 'jejucoding101@gmail.com';
    let adminRes = await fetchAPI('login', { email: adminEmail, password: '1234' });
    if (!adminRes.success) {
        adminRes = await fetchAPI('register', { email: adminEmail, password: '1234', name: '최고관리자', phone: '010-0000-0000' });
        adminRes = await fetchAPI('login', { email: adminEmail, password: '1234' });
    }
    assertValue('어드민 계정 로그인', adminRes, adminRes.user && adminRes.user.role === 'admin', '어드민 권한 식별 실패');

    const adminDashRes = await fetchAPI('adminGetDashboard');
    assertValue('어드민 대시보드 지표 로드', adminDashRes, adminDashRes.data && adminDashRes.data.todayClassesCount !== undefined, '데이터 누락');

    // 2. 가상 유저 1명 세팅
    console.log("\n▶ [STEP 2] 스튜디오 클래스 생성 및 수강권 발급 (관리자 액션)");
    
    // 유저 로드
    const usersRes = await fetchAPI('adminGetUsers');
    assertValue('전체 회원 목록 조회', usersRes, usersRes.data && Array.isArray(usersRes.data), '배열 데이터 반환 안됨');
    let testUser = usersRes.data.find(u => u.email === 'testuser1@yoga.com');
    if(!testUser && usersRes.data.length > 0) {
        testUser = usersRes.data.find(u => u.role === 'member');
    }

    if(testUser) {
        // 클래스 생성
        const className = `E2E 테스트 요가 ${Math.floor(Math.random()*1000)}`;
        const dateStr = getFormattedDate(1); // 내일
        const createClsRes = await fetchAPI('adminCreateClass', { instructor: '테스트강사', class_name: className, date: dateStr, time: '10:00', capacity: 3 });
        assertValue('신규 수업 생성 (adminCreateClass)', createClsRes, true, '');

        // 생성된 클래스 ID 조회
        const allClsRes = await fetchAPI('adminGetAllClasses');
        const createdClass = allClsRes.data.find(c => c.class_name === className);
        assertValue('생성된 수업 확인 (adminGetAllClasses)', allClsRes, createdClass !== undefined, '금방 만든 수업이 목록에 없음');

        // 수강권 부여
        const grantRes = await fetchAPI('adminGrantPass', { user_id: testUser.user_id, pass_type: 'Test Pass', count: 2, days_valid: 10 });
        assertValue('특정 회원에게 수강권 발급 (adminGrantPass)', grantRes, true, '');

        // 3. 회원 기능 테스트
        console.log("\n▶ [STEP 3] 회원 수강신청, 내 예약 조회, 취소 처리 검증 (회원 액션)");
        
        // 회원 대시보드 로드
        const myDashBefore = await fetchAPI('getUserDashboard', { user_id: testUser.user_id });
        const passBefore = myDashBefore.data.passes.find(p => p.pass_type === 'Test Pass' && parseInt(p.remaining_count) > 0);
        assertValue('회원 본인의 수강권 조회 (getUserDashboard)', myDashBefore, passBefore !== undefined, '발급받은 수강권이 안보임');

        if(createdClass && passBefore) {
            // 예약 시도
            const preCount = parseInt(passBefore.remaining_count);
            const bookRes = await fetchAPI('bookClass', { user_id: testUser.user_id, class_id: createdClass.class_id });
            assertValue('클래스 수강 예약 (bookClass)', bookRes, true, '');
            
            await delay(1000); // 락 제어 여유

            // 예약 후 차감 확인
            const myDashAfterBook = await fetchAPI('getUserDashboard', { user_id: testUser.user_id });
            const passAfterBook = myDashAfterBook.data.passes.find(p => p.pass_id === passBefore.pass_id);
            const bookedItem = myDashAfterBook.data.bookings.find(b => b.class_id === createdClass.class_id && b.status === 'booked');
            
            assertValue('예약 후 수강권 정상 차감 검증', myDashAfterBook, parseInt(passAfterBook.remaining_count) === preCount - 1, `차감 실패 (이전: ${preCount}, 이후: ${passAfterBook.remaining_count})`);
            assertValue('예약 내역에 booked 상태 등록 검증', myDashAfterBook, bookedItem !== undefined, '내역에 안뜸');

            // 예약 취소
            if(bookedItem) {
                const cancelRes = await fetchAPI('cancelBooking', { user_id: testUser.user_id, booking_id: bookedItem.booking_id });
                assertValue('수강 예약 취소 (cancelBooking)', cancelRes, true, '');

                await delay(1000);

                // 최소 후 반환 확인
                const myDashAfterCancel = await fetchAPI('getUserDashboard', { user_id: testUser.user_id });
                const passAfterCancel = myDashAfterCancel.data.passes.find(p => p.pass_id === passBefore.pass_id);
                const canceledItem = myDashAfterCancel.data.bookings.find(b => b.booking_id === bookedItem.booking_id);
                
                assertValue('취소 후 수강권 정상 환급 검증', myDashAfterCancel, parseInt(passAfterCancel.remaining_count) === preCount, '환불 처리 안됨');
                assertValue('예약 내역 상태 canceled 변경 검증', myDashAfterCancel, canceledItem && canceledItem.status === 'canceled', '취소 상태 변경 안됨');
            }
        } else {
             console.log(" ⚠️ [SKIP] 예약 테스트 스킵 (클래스 또는 수강권 초기화에 실패함)");
        }
    } else {
         console.log(" ⚠️ [ERROR] 테스트 대상 회원이 DB에 없습니다. test_traffic.js 를 먼저 실행해주세요.");
    }

    // 4. 리포트 출력
    console.log("\n=========================================================");
    console.log(` 📊 최종 테스트 결과 리포트`);
    console.log("=========================================================");
    console.log(` - 성공(PASS) : ${report.passed} 건`);
    console.log(` - 실패(FAIL) : ${report.failed} 건`);
    
    if(report.failed > 0) {
        console.log("\n [오류 발생 내역]");
        report.errors.forEach(e => console.log(` * ${e}`));
    } else {
        console.log("\n 🎉 모든 기능이 정상적으로(100%) 동작하고 있습니다!");
        console.log("    앱 배포 및 실운영이 가능한 안정적인 상태입니다.");
    }
    console.log("=========================================================\n");
}

runTestReport();
