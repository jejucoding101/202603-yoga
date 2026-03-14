/**
 * API Communication Layer for The Yoga Sanctuary
 * Replace GAS_WEB_APP_URL with your deployed Google Apps Script URL.
 */

// TODO: User must replace this with the generated Google Apps Script Web App URL
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz2vxj6mV-F7lWVWXmRnFt5jDRgQv2btN_UVu_F9SPiKptElXSVIp7VKwEofVS2HLP8/exec";

const api = {
    // 공통 Fetch 함수
    async request(method, action, payload = null) {
        let url = `${GAS_WEB_APP_URL}?action=${action}`;
        const options = {
            method: method,
            headers: {},
        };

        // 개발 환경이나 GAS CORS 제약 등을 위해 보통 POST 요청은 payload를 stringify해서 전송
        if (method === 'POST') {
            options.body = JSON.stringify(payload);
            options.headers['Content-Type'] = 'text/plain;charset=utf-8';
            // GAS는 application/json preflight를 우회하기 위해 text/plain을 자주 사용합니다.
        } else if (method === 'GET' && payload) {
            // GET payload를 쿼리 파라미터로 변환
            for (let filter in payload) {
                url += `&${filter}=${encodeURIComponent(payload[filter])}`;
            }
        }

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API Error:', error);
            // mock 에러 반환
            return { success: false, message: '통신 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' };
        }
    },

    // 1. 인증
    login(email, password) {
        return this.request('POST', 'login', { email, password });
    },
    register(name, phone, email, password) {
        return this.request('POST', 'register', { name, phone, email, password });
    },

    // 2. 회원 대상
    getUserDashboard(user_id) {
        return this.request('GET', 'getUserDashboard', { user_id });
    },
    getClasses() {
        return this.request('GET', 'getClasses');
    },
    bookClass(user_id, class_id) {
        return this.request('POST', 'bookClass', { user_id, class_id });
    },
    cancelBooking(user_id, booking_id) {
        return this.request('POST', 'cancelBooking', { user_id, booking_id });
    },

    // 3. 관리자 대상
    adminGetDashboard() {
        return this.request('GET', 'adminGetDashboard');
    },
    adminGetUsers() {
        return this.request('GET', 'adminGetUsers');
    },
    adminGrantPass(user_id, pass_type, count, days_valid) {
        return this.request('POST', 'adminGrantPass', { user_id, pass_type, count, days_valid });
    },
    adminCreateClass(instructor, class_name, date, time, capacity) {
        return this.request('POST', 'adminCreateClass', { instructor, class_name, date, time, capacity });
    },
    adminGetBookings(class_id) {
        return this.request('GET', 'adminGetBookings', { class_id });
    },
    adminGetAllClasses() {
        return this.request('GET', 'adminGetAllClasses');
    },
    adminUpdateClass(class_id, updates) {
        return this.request('POST', 'adminUpdateClass', { class_id, ...updates });
    },
    adminDeleteClass(class_id) {
        return this.request('POST', 'adminDeleteClass', { class_id });
    }
};

window.api = api;
