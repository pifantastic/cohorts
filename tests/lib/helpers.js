
window.helpers = {

	clearCookies: function () {
		Object.keys(cohorts.Cookies.get()).forEach(function (cookie) {
			cohorts.Cookies.set(cookie, null);
		});
	}

};
