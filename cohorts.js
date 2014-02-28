
(function() {

  var Options = {
    debug: false
  };

  // Keep track of instantiated tests
  var tests = {};

  // Create the main Test object constructor
  var Test = (function() {

    var cookiePrefix = '_cohort';

    var constructor = function (options) {
      this.options = Utils.extend({
        name: null,
        sections: null,
        sample: 1.0,
        exclude: null,
        cookieExpiryHours: 3000
      }, options);

      if (this.options.name === null) {
        throw new Error('A name for this test must be specified');
      }

      if (this.options.sections === null) {
        throw new Error('Sections for this test must be specified');
      }

      // Remember this instance
      tests[this.options.name] = this;

      this.run();
    };

    constructor.prototype = {

      run: function() {
        var i;
        var chosen_cohort;
        var excludeItem;
        var len;
        var section;
        var variation;

        // Determine whether user has already been from test candidates
        var in_test = this.inTest();

        // Check to see if URL forces visitor out of the test #testname=none or
        // if URL forces visitor into a cohort (testing only as it otherwise
        // invalidates the data)
        var hash = window.location.hash;
        if (hash.indexOf('#') === 0) {
          hash = hash.slice(1, hash.length);
        }

        var pairs = hash.split('&');
        for (i = 0; i < pairs.length; i++) {
          var pair = pairs[i].split('=');
          var name = pair[0];
          var cohort = pair[1];
          if (this.options.name == name) {
            if (cohort == 'none') {
              Utils.log('Forcing test ' + name + ' to none (not in any cohort) due to URL');
              in_test = false;
              this.setNotInTest('forced');
              break;
            }
            else {
              Utils.log('Forcing test ' + name + ' into cohort ' + cohort + ' due to URL');
              in_test = true;
              this.setCohort(cohort+',forced');
              break;
            }
          }
        }

        // Exclude test candidates based on options.exclude.referrers ?
        if (in_test === null && this.options.exclude && this.options.exclude.referrers) {
          for (excludeItem in this.options.exclude.referrers) {
            len = this.options.exclude.referrers[excludeItem].length;
            for (i = 0; i < len; i++) {
              Utils.log('Checking ' + excludeItem + ' if referrer "' + document.referrer + '" matches "' + this.options.exclude.referrers[excludeItem][i] + '"');
              if (document.referrer.match(this.options.exclude.referrers[excludeItem][i])) {
                this.setNotInTest(excludeItem);
                in_test = false;
                break;
              }
            }
          }
        }

        // Exclude test candidates based on url ?
        if (in_test === null && this.options.exclude && this.options.exclude.locations) {
          for (excludeItem in this.options.exclude.locations) {
            len = this.options.exclude.locations[excludeItem].length;
            for (i = 0; i < len; i++) {
              Utils.log('Checking to see if location "' + window.location.toString() + '" matches "' + this.options.exclude.locations[excludeItem][i] + '"');
              if (window.location.toString().match(this.options.exclude.locations[excludeItem][i])) {
                this.setNotInTest(excludeItem);
                in_test = false;
                break;
              }
            }
          }
        }

        // Haven't seen this user or rejected this user
        if (in_test === null) {
          in_test = Math.random() <= this.options.sample;
          if (!in_test) {
            this.setNotInTest('notchosen');
          }
        }

        if (in_test) {
          if (!this.getCohort()) {
            // Iterate through each section, randomly choosing a variation
            chosen_cohort = '';
            var first = true;
            for (var sectionName in this.options.sections) {
              Utils.log('processing section ' + sectionName);
              section = this.options.sections[sectionName];
              var variationFraction = 1.0 / Utils.size(section);
              var variationIndex = Math.floor(Math.random() / variationFraction);
              variation = Utils.keys(section)[variationIndex];
              Utils.log('chose variation ' + variation);
              if (first) {
                first = false;
                chosen_cohort += sectionName + ":" + variation;
              }
              else {
                chosen_cohort += "," + sectionName + ":" + variation;
              }
            }
            chosen_cohort += '';
            Utils.log('cohort is ' + chosen_cohort);
            this.setCohort(chosen_cohort);
            chosen_cohort = this.getCohort();
          }
          else {
            chosen_cohort = this.getCohort();
          }

          // Adjust the display according to the chosen cohort and the section settings
          pairs = chosen_cohort.split(",");

          for (i = 0; i < pairs.length; i++) {
            var choices = pairs[i].split(":");
            section = choices[0];
            variation = choices[1];

            if (this.options.sections[section] && this.options.sections[section][variation]) {
              if (this.options.sections[section][variation].css) {
                Utils.log(section + ' ' + variation + ' css: ' + this.options.sections[section][variation].css);
                document.write('<style type="text/css">' + this.options.sections[section][variation].css + '</style>');
              }

              if (this.options.sections[section][variation].scriptUrl) {
                Utils.log(section + ' ' + variation + ' scriptUrl: ' + this.options.sections[section][variation].scriptUrl);
                document.write('<script type="text/javascript" src="' + this.options.sections[section][variation].scriptUrl + '"></script>');
              }

              if (this.options.sections[section][variation].onChosen) {
                Utils.log(section + ' ' + variation + ' onChosen: ' + this.options.sections[section][variation].onChosen);
                this.options.sections[section][variation].onChosen();
              }
            }
          }
        }

        // Update the cookie
        this.setCookie(this.getCookie());
      },

      inTest: function() {
        var cookie = this.getCookie();

        if (cookie === null) {
          return null;
        }
        else if (cookie.toString().match(/^intest:false/)) {
          return false;
        }
        else {
          return true;
        }
      },

      setNotInTest: function (reason) {
        this.setCookie('intest:false,reason:' + reason);
      },

      getCohort: function () {
        return this.getCookie();
      },

      setCohort: function (cohort) {
        this.setCookie(cohort);
        return true;
      },

      setCookie: function (value) {
        Cookies.set(cookiePrefix + '_' + this.options.name, value, {
          hoursToLive: this.options.cookieExpiryHours
        });
      },

      getCookie: function () {
        return Cookies.get(cookiePrefix + '_' + this.options.name);
      }

    };

    return constructor;
  })();

  var Utils = {

    extend: function (destination, source) {
      for (var property in source) {
        if (source.hasOwnProperty(property)) {
          destination[property] = source[property];
        }
      }
      return destination;
    },

    size: function (object) {
      var i = 0;
      for (var property in object) {
        if (object.hasOwnProperty(property)) {
          i += 1;
        }
      }
      return i;
    },

    keys: function (object) {
      var results = [];
      for (var property in object) {
        if (object.hasOwnProperty(property)) {
          results.push(property);
        }
      }
      return results;
    },

    log: function (message) {
      if (window['console'] && Options.debug) {
        if (console.log) {
          console.log(message);
        }
        else {
          alert(message);
        }
      }
    }
  };

  // Adapted from James Auldridge's jquery.cookies
  var Cookies = (function() {

    var resolveOptions;
    var assembleOptionsString;
    var parseCookies;
    var constructor;

    var defaultOptions = {
      expiresAt: null,
      path: '/',
      domain:  null,
      secure: false
    };

    /**
     * resolveOptions - receive an options object and ensure all options are present and valid, replacing with defaults where necessary
     *
     * @access private
     * @static
     * @parameter Object options - optional options to start with
     * @return Object complete and valid options object
     */
    resolveOptions = function (options) {
      var returnValue;
      var expireDate;

      if (typeof options !== 'object' || options === null) {
        returnValue = defaultOptions;
      }
      else {
        returnValue = {
          expiresAt: defaultOptions.expiresAt,
          path: defaultOptions.path,
          domain: defaultOptions.domain,
          secure: defaultOptions.secure
        };

        if (typeof options.expiresAt === 'object' && options.expiresAt instanceof Date) {
          returnValue.expiresAt = options.expiresAt;
        }
        else if (typeof options.hoursToLive === 'number' && options.hoursToLive !== 0) {
          expireDate = new Date();
          expireDate.setTime(expireDate.getTime() + (options.hoursToLive * 60 * 60 * 1000));
          returnValue.expiresAt = expireDate;
        }

        if (typeof options.path === 'string' && options.path !== '') {
          returnValue.path = options.path;
        }

        if (typeof options.domain === 'string' && options.domain !== '') {
          returnValue.domain = options.domain;
        }

        if (options.secure === true) {
          returnValue.secure = options.secure;
        }
      }

      return returnValue;
    };

    /**
     * assembleOptionsString - analyze options and assemble appropriate string for setting a cookie with those options
     *
     * @access private
     * @static
     * @parameter options OBJECT - optional options to start with
     * @return STRING - complete and valid cookie setting options
     */
    assembleOptionsString = function (options) {
      options = resolveOptions(options);

      return (
        (typeof options.expiresAt === 'object' && options.expiresAt instanceof Date ? '; expires=' + options.expiresAt.toGMTString() : '') +
        '; path=' + options.path +
        (typeof options.domain === 'string' ? '; domain=' + options.domain : '') +
        (options.secure === true ? '; secure' : '')
      );
    };

    /**
    * parseCookies - retrieve document.cookie string and break it into a hash with values decoded and unserialized
    *
    * @access private
    * @static
    * @return OBJECT - hash of cookies from document.cookie
    */
    parseCookies = function () {
      var cookies = {};
      var i;
      var pair;
      var name;
      var value;
      var separated = document.cookie.split(';');
      var unparsedValue;

      for (i = 0; i < separated.length; i = i + 1) {
        pair = separated[i].split('=');
        name = pair[0].replace(/^\s*/, '').replace(/\s*$/, '');

        try {
          value = decodeURIComponent(pair[1]);
        }
        catch (e1) {
          value = pair[1];
        }

        if (typeof JSON === 'object' && JSON !== null && typeof JSON.parse === 'function') {
          try {
            unparsedValue = value;
            value = JSON.parse(value);
          }
          catch (e2) {
            value = unparsedValue;
          }
        }

        cookies[name] = value;
      }

      return cookies;
    };

    constructor = function () {};

    /**
     * get - get one, several, or all cookies
     *
     * @access public
     * @paramater Mixed cookieName - String:name of single cookie; Array:list of multiple cookie names; Void (no param):if you want all cookies
     * @return Mixed - Value of cookie as set; Null:if only one cookie is requested and is not found; Object:hash of multiple or all cookies (if multiple or all requested);
     */
    constructor.prototype.get = function (cookieName) {
      var returnValue, item, cookies = parseCookies();

      if (typeof cookieName === 'string') {
        returnValue = (typeof cookies[cookieName] !== 'undefined') ? cookies[cookieName] : null;
      }
      else if (typeof cookieName === 'object' && cookieName !== null) {
        returnValue = {};
        for (item in cookieName) {
          if (typeof cookies[cookieName[item]] !== 'undefined') {
            returnValue[cookieName[item]] = cookies[cookieName[item]];
          }
          else {
            returnValue[cookieName[item]] = null;
          }
        }
      }
      else {
        returnValue = cookies;
      }

      return returnValue;
    };

    /**
     * filter - get array of cookies whose names match the provided RegExp
     *
     * @access public
     * @paramater Object RegExp - The regular expression to match against cookie names
     * @return Mixed - Object:hash of cookies whose names match the RegExp
     */
    constructor.prototype.filter = function (cookieNameRegExp) {
      var cookieName;
      var returnValue = {};
      var cookies = parseCookies();

      if (typeof cookieNameRegExp === 'string') {
        cookieNameRegExp = new RegExp(cookieNameRegExp);
      }

      for (cookieName in cookies) {
        if (cookieName.match(cookieNameRegExp)) {
          returnValue[cookieName] = cookies[cookieName];
        }
      }

      return returnValue;
    };

    /**
     * set - set or delete a cookie with desired options
     *
     * @access public
     * @paramater String cookieName - name of cookie to set
     * @paramater Mixed value - Any JS value. If not a string, will be JSON encoded; NULL to delete
     * @paramater Object options - optional list of cookie options to specify
     * @return void
     */
    constructor.prototype.set = function (cookieName, value, options) {
      if (typeof options !== 'object' || options === null) {
        options = {};
      }

      if (typeof value === 'undefined' || value === null) {
        value = '';
        options.hoursToLive = -8760;
      }
      else if (typeof value !== 'string') {
        if (typeof JSON === 'object' && JSON !== null && typeof JSON.stringify === 'function') {
          value = JSON.stringify(value);
        }
        else {
          throw new Error('cookies.set() received non-string value and could not serialize.');
        }
      }

      var optionsString = assembleOptionsString(options);

      document.cookie = cookieName + '=' + encodeURIComponent(value) + optionsString;
    };

    /**
     * del - delete a cookie (domain and path options must match those with
     * which the cookie was set; this is really an alias for set() with
     * parameters simplified for this use)
     *
     * @access public
     * @paramater Mixed cookieName - String name of cookie to delete, or Bool true to delete all
     * @paramater Object options - optional list of cookie options to specify ( path, domain )
     * @return void
     */
    constructor.prototype.del = function (cookieName, options) {
      var allCookies = {};
      var name;

      if (typeof options !== 'object' || options === null) {
        options = {};
      }

      if (typeof cookieName === 'boolean' && cookieName === true) {
        allCookies = this.get();
      }
      else if (typeof cookieName === 'string') {
        allCookies[cookieName] = true;
      }

      for (name in allCookies) {
        if (typeof name === 'string' && name !== '') {
          this.set(name, null, options);
        }
      }
    };

    /**
     * test - test whether the browser is accepting cookies
     *
     * @access public
     * @return Boolean
     */
    constructor.prototype.test = function () {
      var returnValue = false;
      var testName = 'cT';
      var testValue = 'data';

      this.set(testName, testValue);

      if (this.get(testName) === testValue) {
        this.del(testName);
        returnValue = true;
      }

      return returnValue;
    };

    /**
     * setOptions - set default options for calls to cookie methods
     *
     * @access public
     * @param Object options - list of cookie options to specify
     * @return void
     */
    constructor.prototype.setOptions = function (options) {
      if (typeof options !== 'object') {
        options = null;
      }

      defaultOptions = resolveOptions(options);
    };

    return new constructor();
  })();

  // Return the public methods and objects
  var Cohorts = {
    Test: Test,
    tests: tests,
    Utils: Utils,
    Cookies: Cookies,
    Options: Options
  };

  // AMD / RequireJS
  if (typeof define !== 'undefined' && define.amd) {
    define([], function () {
      return Cohorts;
    });
  }
  // Node.js
  else if (typeof module !== 'undefined' && module.exports) {
    module.exports = Cohorts;
  }
  // included directly via <script> tag
  else {
    this.cohorts = Cohorts;
  }

})();
