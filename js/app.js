/**
 * App UI Logic for The Yoga Sanctuary
 */

const app = {
    user: null,

    // 시간 포맷 유틸: "15:21" → "오후 3:21"
    formatTime(timeStr) {
        if (!timeStr || typeof timeStr !== 'string') return timeStr || '';
        const parts = timeStr.split(':');
        if (parts.length < 2) return timeStr;
        let h = parseInt(parts[0], 10);
        const m = parts[1];
        const period = h < 12 ? '오전' : '오후';
        if (h === 0) h = 12;
        else if (h > 12) h -= 12;
        return `${period} ${h}:${m}`;
    },

    // 날짜 포맷 유틸: "2026-03-14" → "3월 14일 (토)"
    formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T00:00:00');
        if (isNaN(d)) return dateStr;
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
    },

    // 5분 간격 시간 옵션 생성 (select 요소용)
    populateTimeSelect(selectEl, selectedValue) {
        selectEl.innerHTML = '';
        for (let h = 0; h < 24; h++) {
            for (let m = 0; m < 60; m += 5) {
                const val = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
                const label = this.formatTime(val);
                const selected = (val === selectedValue) ? 'selected' : '';
                selectEl.innerHTML += `<option value="${val}" ${selected}>${label}</option>`;
            }
        }
    },

    init() {
        this.user = JSON.parse(localStorage.getItem('yoga_user'));
        this.bindAuthEvents();
    },

    bindAuthEvents() {
        const loginForm = document.getElementById('login-form');
        const toggleAuthBtn = document.getElementById('toggle-auth');
        let isSignup = false;

        if (toggleAuthBtn) {
            toggleAuthBtn.addEventListener('click', (e) => {
                e.preventDefault();
                isSignup = !isSignup;
                document.getElementById('name-group').style.display = isSignup ? 'block' : 'none';
                document.getElementById('phone-group').style.display = isSignup ? 'block' : 'none';
                document.getElementById('auth-title').innerText = isSignup ? '회원가입' : '로그인';
                document.getElementById('auth-subtitle').innerText = isSignup ? 'The Yoga Sanctuary에 오신 것을 환영합니다.' : '다시 만나서 반가워요.';
                document.getElementById('submit-btn').innerText = isSignup ? '가입하기' : '로그인';
                document.getElementById('toggle-text').innerText = isSignup ? '이미 회원이신가요?' : '아직 회원이 아니신가요?';
                document.getElementById('toggle-auth').innerText = isSignup ? '로그인하기' : '회원가입하기';
            });
        }

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const msgEl = document.getElementById('auth-msg');
                const submitBtn = document.getElementById('submit-btn');

                submitBtn.disabled = true;
                msgEl.innerText = "요청 중...";

                try {
                    let result;
                    if (isSignup) {
                        const name = document.getElementById('name').value;
                        const phone = document.getElementById('phone').value;
                        result = await window.api.register(name, phone, email, password);
                    } else {
                        result = await window.api.login(email, password);
                    }

                    if (result.success && result.user) {
                        localStorage.setItem('yoga_user', JSON.stringify(result.user));
                        window.location.href = result.user.role === 'admin' ? 'admin.html' : 'dashboard.html';
                    } else {
                        msgEl.innerText = result.message || "오류가 발생했습니다.";
                    }
                } catch(e) {
                    msgEl.innerText = "통신 중 문제가 발생했습니다.";
                } finally {
                    submitBtn.disabled = false;
                }
            });
        }
    },

    // -------------------------------------------------------------
    // Dashboard Logic
    // -------------------------------------------------------------
    initDashboard() {
        this.user = JSON.parse(localStorage.getItem('yoga_user'));
        if (!this.user || this.user.role === 'admin') {
            window.location.href = 'login.html';
            return;
        }

        document.getElementById('user-greeting').innerText = `${this.user.name} 님, 환영합니다.`;
        document.getElementById('logout-btn').addEventListener('click', this.logout);

        this.bindSidebarNav();
        this.loadDashboardData();
    },

    bindSidebarNav() {
        const links = document.querySelectorAll('.sidebar-nav a');
        const isAdmin = this.user && this.user.role === 'admin';
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                links.forEach(l => l.classList.remove('active'));
                const targetId = e.target.getAttribute('data-target');
                e.target.classList.add('active');

                document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
                document.getElementById(`view-${targetId}`).classList.remove('hidden');

                if (isAdmin) {
                    // 관리자 페이지 탭 전환 시 데이터 로딩
                    if (targetId === 'overview') this.loadAdminDashboard();
                    else if (targetId === 'users') this.loadAdminUsers();
                    else if (targetId === 'classes') this.loadAdminClasses();
                } else {
                    // 회원 페이지 탭 전환 시 데이터 로딩
                    if (targetId === 'dashboard') this.loadDashboardData();
                    else if (targetId === 'classes') this.loadClasses();
                    else if (targetId === 'history') this.loadDashboardData();
                }
            });
        });
    },

    async loadDashboardData() {
        const result = await window.api.getUserDashboard(this.user.user_id);
        if (result && result.success) {
            this.renderPasses(result.data.passes);
            this.renderHistory(result.data.bookings);
            
            // 새 활동 요약 렌더링
            if(result.data.stats) {
                document.getElementById('user-stat-total').innerText = result.data.stats.total_bookings;
                document.getElementById('user-stat-login').innerText = result.data.stats.login_count;
                document.getElementById('user-stat-month').innerText = result.data.stats.this_month_bookings;
                document.getElementById('user-stat-upcoming').innerText = result.data.stats.upcoming_bookings;
            }
        } else {
            console.error("Dashboard 로드 실패");
        }
    },

    renderPasses(passes) {
        const container = document.getElementById('passes-container');
        if (!passes || passes.length === 0) {
            container.innerHTML = `<p style="grid-column: 1/-1;">보유하신 수강권이 없습니다. 구매 문의는 스튜디오로 연락바랍니다.</p>`;
            return;
        }

        let html = '';
        passes.forEach(p => {
            const expiry = new Date(p.expiry_date).toLocaleDateString();
            const valid = (p.remaining_count > 0 && new Date(p.expiry_date) > new Date());
            const opacity = valid ? '1' : '0.5';

            html += `
                <div class="card" style="opacity: ${opacity}; border-top: 4px solid var(--secondary);">
                    <h3 style="margin-bottom:0.5rem;">${p.pass_type}</h3>
                    <p style="font-size: 0.9rem; color: #888;">PASS ID: ${p.pass_id}</p>
                    <div style="font-size: 2rem; font-weight: 700; color: var(--primary); margin: 1rem 0;">
                        ${p.remaining_count} <span style="font-size: 1rem; color: var(--text-main); font-weight: 400;">/ ${p.total_count} 회</span>
                    </div>
                    <p style="font-size: 0.85rem;">만료일: ${expiry}</p>
                    ${!valid ? '<p style="color:red; font-size: 0.8rem; font-weight: bold;">사용불가 (만료/소진)</p>' : ''}
                </div>
            `;
        });
        container.innerHTML = html;
    },

    async loadClasses() {
        const tbody = document.querySelector('#classes-table tbody');
        tbody.innerHTML = '<tr><td colspan="6">로딩중...</td></tr>';

        const result = await window.api.getClasses();
        if (result && result.success) {
            const classes = result.data;
            if(classes.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6">현재 예약 가능한 수업이 없습니다.</td></tr>';
                return;
            }

            let html = '';
            classes.forEach(c => {
                const isFull = c.current_enrolled >= c.capacity;

                html += `
                    <tr>
                        <td>${this.formatDate(c.date)}</td>
                        <td>${this.formatTime(c.time)}</td>
                        <td><strong>${c.class_name}</strong></td>
                        <td>${c.instructor}</td>
                        <td style="color: ${isFull ? 'red' : 'var(--primary)'}">${c.current_enrolled} / ${c.capacity}</td>
                        <td>
                            <button class="btn btn-secondary book-btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" 
                                data-id="${c.class_id}" ${isFull ? 'disabled' : ''}>
                                ${isFull ? '마감' : '예약'}
                            </button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;

            document.querySelectorAll('.book-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const classId = e.target.getAttribute('data-id');
                    if (confirm('이 수업을 예약하시겠습니까? (수강권 1회 차감)')) {
                        e.target.disabled = true;
                        e.target.innerText = "처리중...";
                        const res = await window.api.bookClass(this.user.user_id, classId);
                        if (res.success) {
                            alert('예약이 완료되었습니다.');
                            this.loadClasses();
                            this.loadDashboardData();
                        } else {
                            alert(res.message);
                            e.target.disabled = false;
                            e.target.innerText = "예약";
                        }
                    }
                });
            });
        }
    },

    renderHistory(bookings) {
        const tbody = document.querySelector('#bookings-table tbody');
        if (!bookings || bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">예약 내역이 없습니다.</td></tr>';
            return;
        }

        bookings.sort((a,b) => new Date(b.booking_date) - new Date(a.booking_date));

        let html = '';
        bookings.forEach(b => {
            const statusColor = b.status === 'booked' ? 'var(--primary)' : '#999';
            const statusLabel = b.status === 'booked' ? '예약완료' : '취소됨';
            const className = b.class_info ? b.class_info.class_name : '알 수 없음';
            const classDate = b.class_info ? this.formatDate(b.class_info.date) : '-';
            const classTime = b.class_info ? this.formatTime(b.class_info.time) : '-';
            
            // 날짜 비교 (과거 수업 취소 막기 위함, 단순화하여 일단 날짜만 비교)
            let isPast = false;
            if(b.class_info) {
               isPast = new Date(b.class_info.date) < new Date(new Date().toDateString());
            }

            const canCancel = (b.status === 'booked' && !isPast);

            html += `
                <tr>
                    <td>${classDate}</td>
                    <td>${classTime}</td>
                    <td>${className}</td>
                    <td style="font-weight:bold; color:${statusColor};">${statusLabel}</td>
                    <td>
                        ${canCancel ? 
                        `<button class="btn btn-outline cancel-btn" data-id="${b.booking_id}" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; border-color: #d32f2f; color: #d32f2f;">예약취소</button>` 
                        : '-'}
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

        document.querySelectorAll('.cancel-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const bookingId = e.target.getAttribute('data-id');
                if (confirm('예약을 취소하시겠습니까? 수강권이 1회 복원되며 취소 후 번복할 수 없습니다.')) {
                    e.target.disabled = true;
                    e.target.innerText = "취소중...";
                    const res = await window.api.cancelBooking(this.user.user_id, bookingId);
                    if(res.success) {
                        alert('취소 처리되었습니다.');
                        this.loadDashboardData(); 
                    } else {
                        alert(res.message);
                        e.target.disabled = false;
                        e.target.innerText = "예약취소";
                    }
                }
            })
        });
    },

    // -------------------------------------------------------------
    // Admin Logic
    // -------------------------------------------------------------
    initAdmin() {
        this.user = JSON.parse(localStorage.getItem('yoga_user'));
        if (!this.user || this.user.role !== 'admin') {
            window.location.href = 'login.html';
            return;
        }

        document.getElementById('admin-greeting').innerText = `Admin: ${this.user.name}`;
        document.getElementById('admin-logout-btn').addEventListener('click', this.logout);

        this.bindSidebarNav();
        this.loadAdminDashboard();

        // 수강권 종류 동적 로딩
        this.loadPassTypes();

        // 시간 선택 드롭다운 5분 간격 옵션 생성
        const addTimeSelect = document.getElementById('add-time');
        if (addTimeSelect) this.populateTimeSelect(addTimeSelect, '10:00');

        // 수강권 종류 관리 버튼
        document.getElementById('manage-pass-types-btn')?.addEventListener('click', () => {
            this.showPassTypesModal();
        });

        // Bind Forms
        const passForm = document.getElementById('grant-pass-form');
        if(passForm) {
            passForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const uid = document.getElementById('pass-userid').value;
                const userName = document.getElementById('pass-username').value;
                const type = document.getElementById('pass-type').value;
                const count = document.getElementById('pass-count').value;
                const days = document.getElementById('pass-days').value;
                
                if (!uid) {
                    alert('회원을 먼저 선택해주세요.');
                    return;
                }

                const btn = e.target.querySelector('button[type="submit"]');
                btn.disabled = true;

                const res = await window.api.adminGrantPass(uid, type, parseInt(count), parseInt(days));
                if(res.success) {
                    alert(`✅ 수강권 발급 완료\n\n회원: ${userName}\n수강권: ${type}\n횟수: ${count}회\n유효기간: ${days}일`);
                    this.loadAdminUsers();
                    // 폼 초기화
                    document.getElementById('selected-user-info').innerText = '아래 회원 목록에서 회원을 클릭하여 선택하세요.';
                    document.getElementById('pass-userid').value = '';
                    document.getElementById('pass-username').value = '';
                } else {
                    alert('발급 실패: ' + res.message);
                }
                btn.disabled = false;
            });
        }

        document.getElementById('toggle-class-form')?.addEventListener('click', () => {
            const panel = document.getElementById('create-class-panel');
            panel.classList.toggle('hidden');
        });

        const classForm = document.getElementById('create-class-form');
        if(classForm) {
            classForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = e.target.querySelector('button');
                btn.disabled = true;

                const instructor = document.getElementById('add-instructor').value;
                const name = document.getElementById('add-classname').value;
                const date = document.getElementById('add-date').value;
                const time = document.getElementById('add-time').value;
                const cap = document.getElementById('add-capacity').value;

                const res = await window.api.adminCreateClass(instructor, name, date, time, parseInt(cap));
                if(res.success) {
                    alert('수업이 등록되었습니다.');
                    this.loadAdminClasses();
                } else {
                    alert('등록 실패: ' + res.message);
                }
                btn.disabled = false;
            });
        }

        document.getElementById('close-booking-list')?.addEventListener('click', () => {
            document.getElementById('booking-list-panel').classList.add('hidden');
        });
    },

    async loadAdminDashboard() {
        const res = await window.api.adminGetDashboard();
        if(res.success) {
            const d = res.data;
            document.getElementById('stat-new-users').innerText = d.newUsersThisMonth || 0;
            document.getElementById('stat-today').innerText = d.todayClassesCount || 0;
            document.getElementById('stat-today-rate').innerText = d.todayAvgBookingRate || 0;
            document.getElementById('stat-pending').innerText = d.pendingBookings || 0;

            const renderList = (id, items, emptyMsg, htmlFn) => {
                const ul = document.getElementById(id);
                if (!items || items.length === 0) {
                    ul.innerHTML = `<li style="padding: 0.5rem 0; color: #888; border-bottom: none;">${emptyMsg}</li>`;
                    return;
                }
                ul.innerHTML = items.map(htmlFn).join('');
            };

            renderList('list-expiring', d.expiringPasses, "현재 만료 임박 수강권이 없습니다.", 
                p => `<li style="padding: 0.5rem 0; border-bottom: 1px solid #ffcdd2;">
                    <strong>${p.user_name}</strong> <span style="font-size:0.85rem; color:#666;">(${p.user_phone})</span><br>
                    <span style="color:#d32f2f; font-weight:600;">${p.pass_type} - 잔여: ${p.remaining_count}회 (~${new Date(p.expiry_date).toLocaleDateString()})</span>
                </li>`
            );

            renderList('list-inactive', d.inactiveUsers, "장기 미출석 회원이 없습니다.", 
                u => `<li style="padding: 0.5rem 0; border-bottom: 1px solid #ffe082;">
                    <strong>${u.user_name}</strong> <span style="font-size:0.85rem; color:#666;">(${u.user_phone})</span><br>
                    <span style="color:#e65100; font-size:0.9rem;">마지막 수강/접속: ${new Date(u.last_login).toLocaleDateString()}</span>
                </li>`
            );

            renderList('list-top-users', d.topEngagedUsers, "활동 데이터가 없습니다.", 
                u => `<li style="padding: 0.5rem 0; border-bottom: 1px solid #c8e6c9;">
                    <span style="display:inline-block; width:20px;">🥇</span> <strong style="color:var(--primary);">${u.name}</strong> 
                    <span style="font-size:0.85rem; color:#555; margin-left:0.5rem;">(${u.login_count}회 접속)</span>
                </li>`
            );

            renderList('list-top-classes', d.topClasses, "수업 데이터가 없습니다.", 
                c => `<li style="padding: 0.5rem 0; border-bottom: 1px solid #bbdefb;">
                    <span style="display:inline-block; width:20px;">🔥</span> <strong>${c.class_name}</strong> <span style="font-size:0.85rem; color:#666;">(${c.instructor})</span><br>
                    <span style="font-size:0.85rem; color:var(--blue); margin-left:1.5rem; font-weight:600;">누적 예약 ${c.count}건</span>
                </li>`
            );
        }
    },

    async loadAdminUsers() {
        const tbody = document.querySelector('#admin-users-table tbody');
        tbody.innerHTML = '<tr><td colspan="5">로딩중...</td></tr>';
        
        const res = await window.api.adminGetUsers();
        if(res.success) {
            let html = '';
            res.data.forEach(u => {
                // 수강권 요약 텍스트
                const passesInfo = u.passes.map(p => {
                    const valid = p.remaining_count > 0 && new Date(p.expiry_date) > new Date();
                    return `<span style="color:${valid ? 'var(--primary)' : '#aaa'}; display:block;">
                        ${p.pass_type} (${p.remaining_count}/${p.total_count})
                    </span>`;
                }).join('');

                html += `
                    <tr class="user-select-row" data-userid="${u.user_id}" data-username="${u.name}" style="cursor: pointer; transition: background 0.2s;">
                        <td>${new Date(u.joined_date).toLocaleDateString()}</td>
                        <td style="font-family: monospace; font-size: 0.8rem;">${u.user_id}</td>
                        <td><strong>${u.name}</strong></td>
                        <td>${u.phone}</td>
                        <td>${passesInfo || '<span style="color:#aaa">없음</span>'}</td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;

            // 행 클릭 시 해당 회원을 수강권 부여 폼에 입력
            document.querySelectorAll('.user-select-row').forEach(row => {
                row.addEventListener('click', (e) => {
                    const userId = row.getAttribute('data-userid');
                    const userName = row.getAttribute('data-username');
                    document.getElementById('pass-userid').value = userId;
                    document.getElementById('pass-username').value = userName;
                    document.getElementById('selected-user-info').innerHTML = `선택된 회원: <strong>${userName}</strong> <span style="font-size:0.75rem; color:#888;">(${userId})</span>`;

                    // 선택된 행 하이라이트
                    document.querySelectorAll('.user-select-row').forEach(r => r.style.backgroundColor = '');
                    row.style.backgroundColor = 'rgba(16, 89, 53, 0.08)';
                });

                // 호버 효과
                row.addEventListener('mouseenter', () => { if (!row.style.backgroundColor || row.style.backgroundColor === '') row.style.backgroundColor = 'rgba(0,0,0,0.02)'; });
                row.addEventListener('mouseleave', () => {
                    const isSelected = document.getElementById('pass-userid').value === row.getAttribute('data-userid');
                    if (!isSelected) row.style.backgroundColor = '';
                });
            });
        }
    },

    // 수강권 종류 관리 (localStorage 기반)
    getPassTypes() {
        const stored = localStorage.getItem('yoga_pass_types');
        if (stored) return JSON.parse(stored);
        return ['1:1 PT', 'Monthly Pass', 'Meditation']; // 기본값
    },

    savePassTypes(types) {
        localStorage.setItem('yoga_pass_types', JSON.stringify(types));
    },

    loadPassTypes() {
        const select = document.getElementById('pass-type');
        if (!select) return;
        const types = this.getPassTypes();
        select.innerHTML = types.map(t => `<option value="${t}">${t}</option>`).join('');
    },

    showPassTypesModal() {
        let existing = document.getElementById('pass-types-modal');
        if (existing) existing.remove();

        const types = this.getPassTypes();
        const modal = document.createElement('div');
        modal.id = 'pass-types-modal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; z-index:1000;';
        modal.innerHTML = `
            <div class="card" style="max-width:400px; width:90%;">
                <h3 style="margin-bottom:1rem;">수강권 종류 관리</h3>
                <div id="pass-types-list" style="margin-bottom:1rem;"></div>
                <div style="display:flex; gap:0.5rem;">
                    <input type="text" id="new-pass-type-input" class="form-control" placeholder="새 수강권 종류 이름" style="flex:1;">
                    <button id="add-pass-type-btn" class="btn btn-primary" style="padding:0.5rem 1rem;">추가</button>
                </div>
                <button id="close-pass-types-modal" class="btn btn-outline" style="width:100%; margin-top:1rem;">닫기</button>
            </div>
        `;
        document.body.appendChild(modal);

        const renderList = () => {
            const currentTypes = this.getPassTypes();
            const listEl = document.getElementById('pass-types-list');
            listEl.innerHTML = currentTypes.map((t, i) => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem 0; border-bottom:1px solid #eee;">
                    <span style="font-weight:500;">${t}</span>
                    <button class="remove-pass-type" data-index="${i}" style="border:none; background:none; color:#d32f2f; cursor:pointer; font-size:1.1rem;" title="삭제">×</button>
                </div>
            `).join('');

            listEl.querySelectorAll('.remove-pass-type').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.getAttribute('data-index'));
                    const updated = this.getPassTypes();
                    if (updated.length <= 1) { alert('최소 1개의 수강권 종류가 필요합니다.'); return; }
                    updated.splice(idx, 1);
                    this.savePassTypes(updated);
                    renderList();
                    this.loadPassTypes();
                });
            });
        };
        renderList();

        document.getElementById('add-pass-type-btn').addEventListener('click', () => {
            const input = document.getElementById('new-pass-type-input');
            const val = input.value.trim();
            if (!val) return;
            const updated = this.getPassTypes();
            if (updated.includes(val)) { alert('이미 존재하는 종류입니다.'); return; }
            updated.push(val);
            this.savePassTypes(updated);
            input.value = '';
            renderList();
            this.loadPassTypes();
        });

        document.getElementById('close-pass-types-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    },

    async loadAdminClasses() {
        const tbody = document.querySelector('#admin-classes-table tbody');
        tbody.innerHTML = '<tr><td colspan="7">로딩중...</td></tr>';

        const res = await window.api.adminGetAllClasses();
        
        if (res.success) {
            if (!res.data || res.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7">등록된 수업이 없습니다.</td></tr>';
                return;
            }

            let html = '';
            res.data.forEach(c => {
                const statusColor = c.status === 'open' ? 'var(--primary)' : '#999';
                html += `
                     <tr data-classid="${c.class_id}">
                        <td>${this.formatDate(c.date)}</td>
                        <td>${this.formatTime(c.time)}</td>
                        <td><strong>${c.class_name}</strong></td>
                        <td>${c.instructor}</td>
                        <td>${c.current_enrolled} / ${c.capacity}</td>
                        <td style="font-weight:600; color:${statusColor};">${c.status}</td>
                        <td style="display:flex; gap:0.3rem; flex-wrap:wrap;">
                            <button class="btn btn-outline view-bookings-btn" data-id="${c.class_id}" style="padding: 0.2rem 0.5rem; font-size: 0.8rem;">명단</button>
                            <button class="btn btn-outline edit-class-btn" data-class='${JSON.stringify(c).replace(/'/g, "&#39;")}' style="padding: 0.2rem 0.5rem; font-size: 0.8rem; border-color: var(--secondary); color: var(--secondary);">수정</button>
                            <button class="btn btn-outline toggle-status-btn" data-id="${c.class_id}" data-status="${c.status}" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; border-color: ${c.status === 'open' ? '#d32f2f' : 'var(--primary)'}; color: ${c.status === 'open' ? '#d32f2f' : 'var(--primary)'};">${c.status === 'open' ? '마감' : '오픈'}</button>
                            <button class="btn btn-outline delete-class-btn" data-id="${c.class_id}" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; border-color: #d32f2f; color: #d32f2f;">삭제</button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;

            // 명단 조회
            document.querySelectorAll('.view-bookings-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const cid = e.target.getAttribute('data-id');
                    const bListPanel = document.getElementById('booking-list-panel');
                    const ul = document.getElementById('booking-list-ul');
                    
                    bListPanel.classList.remove('hidden');
                    ul.innerHTML = '<li>로딩중...</li>';
                    
                    const resBkg = await window.api.adminGetBookings(cid);
                    if(resBkg.success) {
                        const bList = resBkg.data;
                        if(bList.length === 0) {
                            ul.innerHTML = '<li>현재 예약자가 없습니다.</li>';
                        } else {
                            ul.innerHTML = bList.map(b => 
                                `<li><strong>${b.user_name}</strong> (${b.user_email}) - 예약일: ${new Date(b.booking_date).toLocaleString()} <span style="font-size:0.8rem; color:#aaa;">[${b.user_id}]</span></li>`
                            ).join('');
                        }
                    } else {
                        ul.innerHTML = '<li>데이터 로드 실패</li>';
                    }
                });
            });

            // 수정 버튼
            document.querySelectorAll('.edit-class-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const classData = JSON.parse(e.target.getAttribute('data-class'));
                    this.showEditClassModal(classData);
                });
            });

            // 상태 토글 (open <-> closed)
            document.querySelectorAll('.toggle-status-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const cid = e.target.getAttribute('data-id');
                    const currentStatus = e.target.getAttribute('data-status');
                    const newStatus = currentStatus === 'open' ? 'closed' : 'open';
                    if(confirm(`이 수업을 "${newStatus === 'open' ? '오픈' : '마감'}" 상태로 변경하시겠습니까?`)) {
                        e.target.disabled = true;
                        const res = await window.api.adminUpdateClass(cid, { status: newStatus });
                        alert(res.message);
                        this.loadAdminClasses();
                    }
                });
            });

            // 삭제 버튼
            document.querySelectorAll('.delete-class-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const cid = e.target.getAttribute('data-id');
                    if(confirm('이 수업을 완전히 삭제하시겠습니까? 복구할 수 없습니다.')) {
                        e.target.disabled = true;
                        const res = await window.api.adminDeleteClass(cid);
                        alert(res.message);
                        this.loadAdminClasses();
                    }
                });
            });
        }
    },

    showEditClassModal(classData) {
        // 기존 모달이 있으면 제거
        let existing = document.getElementById('edit-class-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'edit-class-modal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; z-index:1000;';
        modal.innerHTML = `
            <div class="card" style="max-width:500px; width:90%; max-height:90vh; overflow-y:auto;">
                <h3 style="margin-bottom:1.5rem;">수업 수정</h3>
                <form id="edit-class-form">
                    <div class="form-group">
                        <label>수업명</label>
                        <input type="text" id="edit-classname" class="form-control" value="${classData.class_name}" required>
                    </div>
                    <div class="form-group">
                        <label>강사명</label>
                        <input type="text" id="edit-instructor" class="form-control" value="${classData.instructor}" required>
                    </div>
                    <div class="form-group">
                        <label>날짜</label>
                        <input type="date" id="edit-date" class="form-control" value="${classData.date}" required>
                    </div>
                    <div class="form-group">
                        <label>시간</label>
                        <select id="edit-time" class="form-control" required>
                            <!-- JS에서 생성 -->
                        </select>
                    </div>
                    <div class="form-group">
                        <label>정원</label>
                        <input type="number" id="edit-capacity" class="form-control" value="${classData.capacity}" min="1" required>
                    </div>
                    <div style="display:flex; gap:1rem; margin-top:1.5rem;">
                        <button type="submit" class="btn btn-primary" style="flex:1;">저장</button>
                        <button type="button" id="cancel-edit-class" class="btn btn-outline" style="flex:1;">취소</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        // 수정 모달 시간 select에 5분 간격 옵션 채우기
        this.populateTimeSelect(document.getElementById('edit-time'), classData.time);

        document.getElementById('cancel-edit-class').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        document.getElementById('edit-class-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerText = '저장 중...';

            const updates = {
                class_name: document.getElementById('edit-classname').value,
                instructor: document.getElementById('edit-instructor').value,
                date: document.getElementById('edit-date').value,
                time: document.getElementById('edit-time').value,
                capacity: parseInt(document.getElementById('edit-capacity').value)
            };

            const res = await window.api.adminUpdateClass(classData.class_id, updates);
            alert(res.message);
            modal.remove();
            this.loadAdminClasses();
        });
    },

    logout(e) {
        if(e) e.preventDefault();
        localStorage.removeItem('yoga_user');
        window.location.href = 'index.html';
    }
};

window.app = app;
app.init();
