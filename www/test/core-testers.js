/**
Тесты проекта javascript
*/

module("Базовый")


test("Особенности replace", function() {
	var a, b
	" ${xxx} ".replace(/\$\{(\w+)\}/, function(a1, b1) { a = a1; b = b1	})
	
	equal(a, "${xxx}", "0-я группа")
	equal(b, "xxx", "1-я группа")
})

test("Особенности RegExp", function() {
	var x
	" {{for xxx}} {{for yyy}} ... {{end yyy}} {{end xxx}} {{for xxx}} ... {{end xxx}}"
		.replace(/\{\{for (\w+)\}\}.*?\{\{end \1\}\}/, function(a, b) { x = a })
	equal(x, "{{for xxx}} {{for yyy}} ... {{end yyy}} {{end xxx}}")
})


module("Проект")

test("Даты", function() {
	var date = new Date()
	date = date.date_only()
	ok(!date.getHours()+date.getMinutes()+date.getSeconds()+date.getMilliseconds())
	equal(date.add(1).getTime(), date.getTime()+24*3600*1000)
	notEqual(date.add(0), date.add(0)) // даты не сравниваются
	var f = new Date(date)
	f.setHours(5)
	ok(date.eq(f))
	
	date = new Date('2000-12-26'.replace(/-/g, "/"))
	var date1 = new Date(2000, 11, 26)
	equal(date.getYear(), date1.getYear())
	equal(date.getMonth(), date1.getMonth())
	equal(date.getDate(), date1.getDate())
});

test("Шаблон", function () {
	var js,
		data,
		html;

	html = "from {{for x1}} r1 ${y1} r2 {{end x1}}";
	data = {
		x1: [{y1: 10}, {y1: 20}]
	};
	js = app.exports.template( html, data );
	equal(js, "from  r1 10 r2  r1 20 r2 ");

	html = "'\n' {{for x1}} r1 {{for x2}} ${y1} r2 {{end x2}} {{end x1}}";
	data = {
		x1: [{x2:[{y1: 10}]}, {x2:[{y1: 20}, {y1:30}]}]
	};
	js = app.exports.template( html, data );
	equal(js, "'\n'  r1  10 r2   r1  20 r2  30 r2  ");

});

test("to_radix", function() {
	equal( to_radix(61, 62), 'z' )
	equal( to_radix(63, 62), '11' )
	equal( to_radix(63, 62, '/'), '1/1/' )
})

test("from_radix", function() {
	equal( from_radix('z', 62), 61 )
	equal( from_radix('11', 62), 63 )
})

test("events", function() {
    var t = 0
	app.event.add('testEvent', 'ex', function(){t=10})
	ok(app.event.event.testEvent.ex)
    app.event.run('testEvent')
	equal(t, 10)
	app.event.rm('testEvent', 'ex')
	ok(app.event.event.testEvent)
	ok(app.event.event.testEvent.ex === undefined)
	app.event.rm('testEvent')
	ok(app.event.event.testEvent === undefined)
})

test("Утилиты", function() {
	// set_elem, get_elem, rm_elem
	var a = {}
	app.util.set_elem(a, 1, 2, 3, 10)
	deepEqual(a, {1: {2: {3: 10}}})
	equal(10, app.util.get_elem(a, 1, 2, 3))
	ok(app.util.get_elem({}, 1, 2, 3) === undefined)
	app.util.rm_elem(a, 1, 2, 3)
	deepEqual(a, {})
	app.util.set_elem(a, 1, 2, 3, 10)
	app.util.set_elem(a, 1, 2, 4, 20)
	app.util.rm_elem(a, 1, 2, 3)
	deepEqual(a, {1: {2: {4: 20}}}, "a")
	
	equal($.toJSON(), "null")
	equal($.toJSON({a:["b", null, false, true]}), '{"a":["b",null,false,true]}')
	
	// rowsToArray
	var rows = [
		["id","name",["ownUser","id","name"]],
		[2,"name1",[[2,null], [3,"x"]]]
	]
	var transArr = [{id: 2, name: 'name1', ownUser: [{id: 2, name: null}, {id: 3, name: "x"}]}]
	var arr = app.util.rowsToArray(rows)
	deepEqual(arr, transArr)
	
	equal( app.exports.repr([1, "", undefined, true, false, null]), '[1, "", undefined, true, false, null]' )
	equal( $.toJSON([1, "", undefined, true, false, null]), '[1,"",null,true,false,null]' )
});

test("Утилиты:rowsToArrayRaces", function () {
    // rowsToArray VS rowsToArrayOpt
    var rows = [
            [
                "id", "name",
                ["ownUser","id","name"]
            ],
            [   2, "name{$index}",
                [[2,null], [3,"x"]]
            ]
        ],
        transArr = [
            {id: 2, name: 'name1',
                ownUser: [
                    {id: 2, name: null},
                    {id: 3, name: "x"}
                ]
            }
        ];

    var testCase = function ( rows_method ) {
            var arr,
                i,
                rows_item,
                len = times.count;


            for ( i = 0; i < len; i += 1 ) {
                rows_item = rows[1][1].replace('{$index}', i);
                rows[1][1] = rows_item;

                arr = app.util[ rows_method ]( rows );
                rows[1][1] = "name{$index}";
            }
            return Date.now();
        },
        times = {
            count: 1000//   чтобы не перегружать тестирование
        }, result;

    times.start = Date.now();
    times.midpoint = testCase( 'rowsToArray' );
    times.finish = testCase( 'rowsToArrayOpt' );

    result = Math.round( (times.midpoint - times.start) / (times.finish - times.start)*100 );

    ok( true, 'Old share in cents = '+ result );
    //
    //  Сильно варьируется как от браузера к браузеру, в том числе по версии, особенно FF,
    //                      так и от текущего ресурса загруженности и производительности
    //
    ok( result - 50 >= -9, 'Case pass treshold' );

    // integrity conformance
    rows_item = rows[1][1].replace('{$index}', 1);
    rows[1][1] = rows_item;
    deepEqual( app.util.rowsToArray( rows ), app.util.rowsToArrayOpt( rows ) );
    deepEqual( app.util.rowsToArray( rows ), transArr );

});

/*
test("mask", function() {
	var overphone = $("#core-me-phone").prev()
	var sel = overphone.children(".app-img-phone")
	var container = overphone.children(".app-container-phone")
	$("#core-me-phone").val("+71234567890").focus()
	
	equal($("#core-me-phone").val(), "+7 (123) 456-78-90")
	
	container.children(":nth(1)").click()
	equal($("#core-me-phone").val(), "+380 (123) 456-789")
})*/

// realtyList
asyncTest("Перевод: полей месяца и даты обратно на русский", function () {
    var lang_helper = {
        current_lang: cookies().lang,
        getLangValue: function () {
            return this.current_lang;//return cookies().lang;
        },
        setLangValue: function (lang) {
            this.current_lang = lang;//app.util.set_cookie( 'lang', lang, 365*20 );
        },
        toggleLang: function (lang) {
            this.setLangValue(lang);
            app.lang.changeLocale(lang);//from app.lang.change();
        },
        //  watch toggle
        //
        $watching:$('label[ for = "flt-from-day" ]'),
        watch_value:null,
                watchingTest: function () {
                    return this.toggle_not_ready === false && this.watch_value == this.$watching.text();
                },
                setToggleWatching: function () {
                    this.watch_value = this.$watching.text();
                    this.toggle();
                },
                wait_toggle_delay: 50,
                toggleCallback: function (callback) {
                    var has_wait = this.watchingTest(),
                        self = this;
                    
                    if ( has_wait ) {
                        setTimeout( function () {
                            self.toggleCallback( callback );//todo push it
                        }, this.wait_toggle_delay );
                    } else {
                        callback();
                    }                   
                },
                toggle_not_ready: true,//until setUp
                toggle: function () {
                    var lang = this.getLangValue(),
                        voc = this.token;

                    lang = ( lang == voc.need_lang ) ? voc.test_lang : voc.need_lang;
                    this.toggleLang( lang );
                },
        //  testcase tokens
        //
        token: {
            test_lang:'uk',
            need_lang:'ru'
        },
        verify: function () {
            var current_token = this.getDatePickerTokens();

            equal(current_token.day, this.token.day);
            equal(current_token.month, this.token.month);
            equal(current_token.month_name, this.token.month_name);
        },
        getDatePickerTokens: function () {
            var pickers = {
                day:$('#flt-from-day'),
                month:$('#flt-from-month')
            };
            return {
                day:pickers.day.find(':eq(0)').text(),
                month:pickers.month.find(':eq(0)').text(),
                month_name:pickers.month.find(':eq(1)').text()
            };
        },
        setUp: function () {
            var self = this,
                voc = this.token,
                callback = function () {
                    $.extend(self.token, self.getDatePickerTokens());
                };

            this.current_lang = cookies().lang;

            if (this.current_lang == voc.need_lang) {
                this.toggle_not_ready = false;
                callback();
            } else {
                this.toggleLang(voc.need_lang);
                this.toggleCallback(function () {
                    callback();
                });
            }
        }
    };

    lang_helper.setUp();

    if (lang_helper.toggle_not_ready) {
        ok(true, "Missed temporary");//todo
        start();
    } else {
        lang_helper.setToggleWatching();
        lang_helper.toggleCallback(function () {
            lang_helper.setToggleWatching();
            lang_helper.toggleCallback(function () {
                ok(true, "Passed and ready to resume!");
                start();
                lang_helper.verify();
            });
        });
    }
});