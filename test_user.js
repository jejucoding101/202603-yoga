const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxjDEMolRhAczP-YQmqZocu38i0XHbPAcbloio4-DL_5xg6rDTQpIW9S8YhbiqkBQ8M/exec";

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

async function runUserSimulation() {
    console.log("=========================================================");
    console.log(" 🧘‍♀️ [User Simulation] 20명 다계정 랜덤 액션 테스트");
    console.log("=========================================================\n");

    // 테스트 회원 목록을 확보하기 위해 스크립트 편의상 관리자로 한 번 호출해서 명단만 가져옴
    // (실제 유저들은 자기 이메일/비번으로 로그인해야 하지만, 식별자 user_id를 바로 얻기 위한 트릭)
    const adminRes = await fetchAPI('login', { email: 'jejucoding101@gmail.com', password: '1234' });
    if (!adminRes.success) return console.log("❌ 관리자 로그인이 안되어 유저 목록을 가져올 수 없습니다.");

    const usersRes = await fetchAPI('adminGetUsers');
    let allUsers = usersRes.data.filter(u => u.role === 'member' || u.email.startsWith('testuser')).slice(0, 20);
    
    if (allUsers.length === 0) return console.log("❌ 테스트할 회원이 없습니다.");

    let totalSuccess = 0, totalFails = 0;

    console.log(`▶ 총 ${allUsers.length}명의 회원으로 20번의 랜덤 접속/예약 액션을 시뮬레이션 합니다.\n`);

    for (let r = 1; r <= 20; r++) {
        console.log(`\n --- [액션 #${r}/20] ---`);
        const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
        console.log(` 👤 회원: ${randomUser.name}`);

        const classRes = await fetchAPI('getClasses');
        if (!classRes.success || classRes.data.length === 0) {
             console.log("   ❌ 예약 가능한 수업이 전혀 없습니다. test_admin.js 를 먼저 실행하세요.");
             continue;
        }

        const myDashRes = await fetchAPI('getUserDashboard', { user_id: randomUser.user_id });
        const myBookings = myDashRes.data.bookings || [];

        const actionScore = Math.random();

        if (actionScore < 0.6) {
            // [예약 시도]
            const targetClass = classRes.data[Math.floor(Math.random() * classRes.data.length)];
            console.log(`   🔸 [수강신청] ${targetClass.date} ${targetClass.time} '${targetClass.class_name}' 예약 시도...`);
            
            const bookRes = await fetchAPI('bookClass', { user_id: randomUser.user_id, class_id: targetClass.class_id });
            
            if (bookRes.success) {
                console.log(`   ✅ 예약 성공!`);
                totalSuccess++;
            } else {
                console.log(`   ℹ️ 예약 거절: ${bookRes.message}`);
                // 정상이유 거절은 패스로 간주, 에러가 터지는 것만 페일로 집계
                if(bookRes.message.includes('정원') || bookRes.message.includes('이미') || bookRes.message.includes('유효한')) {
                     totalSuccess++;
                } else {
                     totalFails++;
                }
            }
        } 
        else if (actionScore < 0.9) {
            // [취소 시도]
            const bookedList = myBookings.filter(b => b.status === 'booked');
            if (bookedList.length > 0) {
                const cancelTarget = bookedList[Math.floor(Math.random() * bookedList.length)];
                console.log(`   🔸 [예약취소] 기존에 등록된 수업 취소 버튼 클릭...`);
                const cancelRes = await fetchAPI('cancelBooking', { user_id: randomUser.user_id, booking_id: cancelTarget.booking_id });
                if(cancelRes.success) {
                    console.log(`   ✅ 취소 정상 처리됨.`);
                    totalSuccess++;
                } else {
                    console.log(`   ❌ 취소 에러: ${cancelRes.message}`);
                    totalFails++;
                }
            } else {
                console.log(`   ℹ️ 취소할 활성 예약이 없어 그냥 나갑니다.`);
            }
        } 
        else {
            // [조회 시도]
            console.log(`   ℹ️ [단순조회] 내 대시보드 내역만 확인하고 나갑니다.`);
            totalSuccess++;
        }

        await delay(1500); 
    }

    console.log("\n=========================================================");
    console.log(` 📊 유저 시뮬레이션 종료`);
    console.log(`    - 정상/예상된 동작: ${totalSuccess} 건`);
    console.log(`    - 비정상 아웃: ${totalFails} 건`);
    console.log("=========================================================\n");
}

runUserSimulation();
