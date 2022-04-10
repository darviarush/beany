// приложение
var app = {
	hash:	null,			// следит за изменением url после #
	page:	null,			// класс управляющий подгружаемыми страницами
	plugin: {},				// список функций-инициализаторов плагинов
	helper: {},				// хелперы для шаблонов
	util: {},				// вспомогательные фукнции
	event: null,			// события устанавливаемые плагинами, например: login и logout
	exports: {},			// экспонируемые плагинами свойства - почти то же, что и события выше
	classes: {},			// классы приложения
	preloader: null,		// показывает диалог "подождите"
	menu: null,				// главное меню
	auth: null,				// функционал проверки авторизации и аутентификации
	lang: null,				// язык
	currency: null,			// выбранная валюта
	data: data,				// глобальные данные
	conf: {					// конфигурация
		// текущая тема
		theme: THEME,
		// текущий город/страна/область
		place: {}
	}
};

/*************************************** Хуки для браузеров **************************************/
if(!window.console) {
	window.console = {log: $.noop}
	log = $.noop
} else {
	log = function() {
		console.log(arguments)
	}
}

/******************************************* Прелоадер *******************************************/
app.preloader = {
	$node: null,
	start: function() {				//  Для всех Ajax при старте запроса показываем значёк
		this.$node.show();
	},
	stop: function() {				//  Для всех Ajax при получении ответа скрываем значёк
		this.$node.hide();
	},
	init: function () {
		this.$node = $( "#preloader" );

		this.$node.ajaxStart( $.proxy( this.start, this ) );
		this.$node.ajaxStop( $.proxy( this.stop, this ) );

		//  Вывод окна с ошибкой
		$( "#error" ).dialog( "close" ).ajaxError( this.onAjaxError );	//   separated with no proxy
	},
	onAjaxError: function (event, jqXHR, ajaxSettings, thrownError) {
		var json

		try {
			json = $.parseJSON( jqXHR.responseText )
		} catch (e) {
		}
		
		if ( json && json.error ) {
			if ( json.data && eval( json.data.fn )( json.data.ret ) === false ) return;
			dialogError( escapeHTML( json.message ) + "<p>" + escapeHTML( json.trace ).replace( /(#\d+ \/[^:]+:)/g, "<font color=royalblue>$1</font>" ).replace( /\n/g, "<br>" ) + "</p>", "Ошибка № " + json.error )
		}
		else dialogError( "Ошибка: " + thrownError + "\n" + jqXHR.responseText )
	}
};

/******************************************* Утилиты *******************************************/
app.util = {
	// переводит полученные данные из вида [[заголовки столбцов], [1-я строка], ...] в [{заголовок1: данные1, ...}, ...]
	//
	// @param {string|array} data
	//
	rowsToArray: function(data) {
		var json = typeof data == "string" ? $.parseJSON(data): data;

		if(json.error) {
			dialogError(json.message, "Ошибка № "+json.error, 1)
			throw "RequestError"
		}

		//
		function toArray(fields, json, begin_i, begin_j) {
			if(!json) return []
			var ret = [],
				len = json.length;

			for(var i=begin_i; i < len ; i++) {
				var obj = {},
					row = json[i];

				for(var j = begin_j; j<fields.length; j++) {
					var fld = fields[j];

					if(fld instanceof Array) {
						var hdr = fld[0]
						obj[hdr] = toArray(fld, row[j-begin_j], 0, 1);
					} else {
						obj[fld] = row[j-begin_j];
					}
				}
				ret.push(obj)
			}
			return ret;
		}

		return toArray(json[0], json, 1, 0)
	},
	//
	// refactored into
	//
	rowsToArrayMethods: {
		offset_row: {
			row: 1, field: 0
		},
		offset_field: {
			row: 0, field: 1
		},
		//
		//  @param {array} fields
		//  @param {array} json
		//  @param {number} firstIndex.row aka begin_i
		//  @param {number} firstIndex.field aka begin_j
		//
		toItems: function ( fields, json, firstIndex ) {
			if (!json) return [];

			var items = [],
				i = firstIndex.row,
				row,
				len = json.length;

			for (; i < len ; i += 1) {
				row = json[ i ];

				items.push( this.rowToItem(row, fields, firstIndex) );
			}

			return items;
		},
		//
		//
		//
		rowToItem: function ( row, fields, firstIndex ) {
			var obj = {},
				prop,
				row_item,
				i = firstIndex.field,
				len = fields.length;

			for (; i < len ; i += 1 ) {
				prop = fields[ i ];
				row_item = row[ i - firstIndex.field ];

				if ( prop instanceof Array ) {
					var hdr = prop[0];
					obj[ hdr ] = this.toItems( prop, row_item, this.offset_field );
				} else {
					obj[ prop ] = row_item;
				}
			}
			return obj;
		}
	},
	rowsToArrayOpt: function (data) {
		var json = typeof data === "string" ? $.parseJSON( data ) : data,
			stem = this.rowsToArrayMethods;

		if ( json.error ) {
			dialogError( json.message, "Ошибка № "+ json.error, 1 );
			throw "RequestError"
		}

		return stem.toItems( json[0], json, stem.offset_row );
	},


	// создаёт класс и добавляет его в app.classes
	Class: function (className, methods) {
		var init;

		if ( methods === undefined ) {
			methods = className
			className = undefined
		}

		if (!methods.init) methods.init = function() {};

		init = methods.init

		function extend(e, pro) {
			var prot = (typeof e == "string" ? app.classes[e] : e),
				f;

			if (!pro ) prot = e.prototype;

			for(var i in prot) {
				f = prot[ i ];

				if (f instanceof Function) f.__name__ = i
				init.prototype[i] = f;
			}
		}
		
		var Extend = methods.Extend
		if ( Extend ) {				// наследуем
			function F() {}
			F.prototype = Extend.prototype
			init.prototype = new F()
			init.prototype.__SUPER__ = Extend
			delete methods.Extend
		}
		
		var Implement = methods.Implement	// расширяем функциями одного класса
		if(Implement) {
			extend(Implement)
			delete methods.Implement
		}

		var Implements = methods.Implements	// расширяем функциями нескольких классов
		if(Implements) {
			for(var i=0; i<Implement.length; i++) extend(Implements[i])
			delete methods.Implements
		}
		
		// прикрепляем методы к классу
		extend( methods, 1 );

		if ( className ) app.classes[ className ] = init;

		return init;
	},

	// подгружает css
	link: function() {
		var link = []
		for(var i=0; i < arguments.length; i++)
			link.push( $("<link></link>").attr("type", "text/css").attr("rel", "stylesheet").attr("href", arguments[i]).appendTo($("head")) )
		return link
	},
	
	id_from_src: function(src) {
		if(!src) return 0
		var path = src.replace(/^.*?\/i\/(.*)\/[^\/]+$/, "$1").replace(/\//g, '')
		return from_radix(path, 62)
	},
	//  устанавливает значения куки
	set_cookie: function(name, value, expires, path, domain, secure) {
		var date = new Date()
		date.setTime(date.getTime() + (expires * 24 * 60 * 60 * 1000) )
		expires = date.toUTCString()
		document.cookie = name + "=" + escape(value) +
			((expires) ? "; expires=" + expires : "") +
			((path) ? "; path=" + path : "") +
			((domain) ? "; domain=" + domain : "") +
			((secure) ? "; secure" : "")
	},
	add_prefix_id: function(elem, prefix) {	// добавляем префикс идентификаторам
		elem.each(function() {		
			var elem = $(this)
			var id = elem.attr("id")
			elem.attr("id", prefix + id)
		})
		return elem
	},
	rm_prefix_id: function(elem, prefix) {	// убираем префикс у идентификаторов
		var regex = new RegExp("^"+prefix)
		elem.each(function() {
			var elem = $(this)
			var id = elem.attr("id")
			elem.attr("id", id.replace(regex, ""))
		})
		return elem
	}
};

/******************************************* Хелперы *******************************************/

app.helper = {
	// превью
	img_preview: function (id, ext, empty) {
		if (!parseInt(id, 10) ) {
			if (!empty ) empty = 'object-view-small.jpg';
			return app.conf.theme + "images/" + empty;
		}

		if (!ext ) ext = '0.png'

		return '/i/'+ to_radix( id, 62, '/' ) + ext;
	},
	img_preview2: function (id) {
		return app.helper.img_preview(id, '2.jpg', 'object-view-large.jpg');
	},
	// путь к картинке
	img: function (id) {
		return app.helper.img_preview(id, '1.jpg', 'empty1.jpg');
	},
	// тема
	theme: function() {
		return app.conf.theme;
	}
}


/******************************************* Классы app *****************************************/

//  класс Page
app.page = {
	// список crc-сумм уже загруженных инклудов
	crc: [],
	// кэш по страницам {path: jquery-elem}
	cached: {},
	// подключает страницу:
	include_html_path: '/api/html',
	include_html: function (path, fn, elem) {
		this.include( this.include_html_path, {	path: path }, fn, elem );
	},
	/**
	 * подключает страницу:
	 *  при повторном вызове просто вызывает контроллер, а затем подставляет данные
	 *
	 * @param path - путь до контроллера
	 * @param param - параметры( обязательный )
	 * @param fn - колбэк
	 * @param elem - узел контекста вставки
	 */
	include: function (path, param, fn, elem) {
		var self = this,
			page = this.cached[ path ];

		if (!fn ) fn = $.noop;

		//  просто вставляем данные в уже существующую страницу
		if ( page && path !== this.include_html_path ) {
			console.log( "NOT TESTED:\npage=" );
			console.log( page );

			$.post( path, param, function (data) {
				data = app.util.rowsToArrayOpt( data );
				page.setFormData( data );

				fn.call( page, data, "json" );
			});
		} else {				//  получаем страницу
			page = ( elem || $("<div></div>" ).appendTo( "body" ) );

			console.log( "nopage @/"+ path );
			this.cached[ path ] = page;
			
			param["F"] = this.crc.join( "," );
			
			$( page ).load( path, param, function (data) {
				fn.call( page, data, "html" );
			});
		}
	},
	/**
	 * injected on backend( in markup of xhr response )
	 * just after closing root html tag
	 *
	 */
	append: function() {	// добавляет контрольные суммы уже вставленных в страницу инклудов
		console.log("app.page.append="+Array.prototype.slice.call(arguments))
		for (var i = 0,	n = arguments.length; i < n ; i++) this.crc.push( arguments[ i ] );
	}
};

app.page.append.apply(app.page, $F)	// $F не может небыть - $F добавляется в начале строки

//  класс Event
app.event = {
	exception_tpl: "event: событие {$traced} уже установлено",
	event: {},
	//  запускает все функции по определенному событию
	run: function (event) {
		var fn = this.event[ event ],
			prop;
		
		if (!fn ) return;
		
		var args = Array.prototype.slice.call(arguments, 1)
		
		for ( prop in fn ) {
			if ( fn.hasOwnProperty( prop ) ) {
				fn[ prop ].apply( this, args);
			}
		}
	},
	//  добавляет пространство имен для глобального события
	getRegistrar: function (event) {
		var registrar = this.event;

		if (!registrar[event]) {
			registrar[ event ] = {};
		}
		return registrar[ event ];
	},
	//  добавляет функцию для обработки глобального события
	add: function (event, name, handler) {
		var registrar = this.getRegistrar( event );

		if (registrar[ name ]) {
			throw this.exception_tpl
				.replace('{$traced}', event +'.'+ name );
		}
		registrar[ name ] = handler;
	},
	//  удаляет функцию для обработки глобального события
	rm: function (event, name) {
		var registrar = this.event[ event ];

		if (registrar) {
			if (name) {
				delete registrar[ name ];
			} else {
				delete this.event[ event ];
			}
		}
	}
};



//  Функционал для определения авторизации и аутентификации
app.auth = {
	user_id: null,
	control: {},
	init: function() {		// инициализирует auth
		if ( cookies().sess ) app.auth.login( $login )
		else app.auth.logout()

		app.event.run( "loaded" )
	},
	//  выполняется при входе пользователя
	login: function (data) {
		if ( typeof data == "string" ) {
			data = $.parseJSON( data );
		}

		this.user_id = data.user_id;
		this.control = data.control;

		//  и на новой странице после загрузки плагинов если есть сессия
		app.event.run( 'login', data );
		//app.auth.isowner = true;// пользователь арендодатель
	},
	//  выполняется при выходе пользователя
	logout: function () {
		this.user_id = null;
		this.control = {};

		app.event.run( 'logout' );
	},
	//  проверяет - есть ли сессия (вдруг пользователь вышел на другой вкладке)
	check: function () {
		var has_session = !!( cookies().sess );

		if (!has_session && this.user_id ) {
			this.logout();
		}

		return has_session;
	},
	//  принадлежит ли пользователю объект
	user: function (user_id) {
		return user_id && user_id == this.user_id;
	}
	/*auth_window: function() {
		app.auth.logout();

		$( "#auth_window" ).overlayDialog( "open" );
		return false;
	}*/
};


// валюты
app.util.Class("Currency", {
	init: function($currency) {		// устанавливает валюты
		$currency = $($currency)
		this.elem = $currency
		$.each( app.data.CURRENCY, function (i, v) {
			$currency.append( $("<option></option>").text( v.name ).val( v.id ) );
			//data.CURRENCY[ v.id ] = v;
		});
	},
	
	id: function() {		// id выбранной валюты
		return this.elem.val()
	}

})

// Меню
app.util.Class( "Menu", {
	init: function (div) {
		this.div = $(div)
		var app_first = '<div class="app-first" />';

		this.menu = {
			'$': $( div || "#menu" ).append( app_first )
		};
	},
	add: function (path, fn) {
		if (typeof path == "string") path = [path];

		var menu = this.menu,
			div;

		for(var i=0; i<path.length; i++) {
			var name = path[i];
			if(!(name in menu)) {	// добавляем подменю
				div = menu.$.find("div:first") // подменю
				if(div.length==0) div = $("<div class=app-menu />").appendTo(menu.$)
				var a = $("<a class=app-a></a>").text(name)
				div = $("<a class=app-s></a>")
					.append(a).appendTo(div);
				menu[ name ] = {
					'$': div
				};

				if($.browser.msie) {
					div.mouseenter(function() { $(this).children(".app-menu").show() }).mouseleave(function() { $(this).children(".app-menu").hide() })
					a.mouseenter(function() { $(this).addClass("app-a-hover") }).mouseleave(function() { $(this).removeClass("app-a-hover") })
				}
			}
			menu = menu[name]
		}
		if (div){
			div.click(function(){
				fn.call($(this), path)
				$(this).unbind('click', fn);
			})
		}
		return this
	},
	//  удаляет последний и все получившиеся пустые
	rm: function (path) {
		var menu = this.menu
		var st = []
		for(var i=0; i<path.length; i++) {
			var name = path[i]
			st.unshift([menu, name])
			menu = menu[name]
		}
		
		for(i=0; i<st.length; i++) {
			var obj = st[i][0]
			var name = st[i][1]
			var menu = obj[name]
			if(menu.$) {
				menu.$.remove()
				delete menu.$
			}
			if(!$.isEmptyObject(menu)) break
			delete obj[name]
		}
	},
	set: function() {	// устанавливает 
		var populateMenu = function (data, idx, callback) {
			var prop, fn;
			for ( prop in data.menu ) {
				fn = app.menu[ prop ] ? get_ref : get_menu;
				if ( callback ) app.menu.add( callback( prop, idx ), fn );
				else app.menu.add( prop, fn );
			}
		};

		function get_menu(e) {
			$.post("api/get_menu", {"path": e}, function (data) {
				var path = e,
					idx = path.length;

				data = $.parseJSON( data );
				/*for(var i in data) {
					var arr = $.extend([], path);
					arr[idx] = i
					app.menu.add(arr, data[i] ?  get_ref : get_menu);
				}*/
				populateMenu( data, idx, function (prop, idx) {
					var arr = [];

					return arr[ idx ] = prop;
				});
			});
		}
		function get_ref(e) {
			$.post("api/get_ref", {
				path: e
			}, function (data) {
				data = $.parseJSON(data);
				ref = $("#"+ data.url);

				if (!ref.length) {
					$("<div></div>").appendTo($("body"))
								.attr("id", data.url)
								.ref(data)
								.overlayDialog( "open" );
				} else {
					ref.overlayDialog("open");
				}

				location.href = "#"+ data.url;
			})
		}

		var self = this
		//  инициализируем справочник
		app.event.add( "login", "ref", populateMenu );
		app.event.add( "logout", "main_menu", function () {
			self.div.empty();
			self.init(self.div);
		});
		//  конец по инициации справочников
	}
});
/*********/





// Переводы сайта на другие языки
app.lang = {
	from: 'ru',
	lang: 'ru',
	ru2cc: {},
	language: {},		// какие языки есть
	
	change_lang: function (elem) {			// рассылает событие
		this.change_html( elem );

		app.event.run( "lang.change" );
	},
	change_html: function (elem) {			// заменяет фразы в html
		var self = this,
			$elem = $( elem ),
			xlang = $( "#language-down" ).clone( true );

		if( this.from == 'ru' ) {
			$elem.each( function () {
				var $ctx = $( this ),
                    t = $ctx.attr("i"),
                    h;

				if ( t && (h = self.ru2cc[t]) !== undefined ) {
                    $ctx.html( h );
                } else if ( (t = $ctx.html())
                            && (t = t.replace(/^\s+/, '').replace(/\s+$/, ''))
                            && (h = self.ru2cc[t]) !== undefined ) {
                    $ctx.html( h );
                    $ctx.attr( "i", t );
                }
			});
		} else if( this.lang == 'ru' ) {
			$elem.each( function () {
				var $ctx = $( this ),
                    t = $ctx.attr("i");

				if ( t ) {
                    $ctx.html( t );
                }
			});
		} else {
			$elem.each( function () {
                var $ctx = $( this ),
                    t = $ctx.attr("i"),
                    h;

                if ( t && (h = self.ru2cc[ t ]) !== undefined ) {
                    $ctx.html( h );
                }
			});
		}

		// чтобы в выборе языка не менялись названия
		$( "#language-down" ).replaceWith( xlang );
	},
	change: function() {		// переключается на другой язык
		var lang = cookies().lang;

		if (!lang ) {
			// определяем язык браузера
			lang = navigator.userAgent.match( /\b[a-z]{2}\b/ );
			lang = lang ? lang[0] : 'ru';

			if (!this.language[ lang ] ) {
				lang = 'ru';
			}
		}
		
		$("#language-sel").html( $( "#lang-"+ lang ).html() );
		$("#language").hide();

		if ( this.lang == lang ) return;	// уже переведён

		this.changeLocale( lang );
	},
	changeLocale: function (lang) {			// изменяет язык, устанавливает все переменные объекта
		var self = this;
		
		$.get("/locale/"+ lang +".json", function (data) {	// получаем новый язык
			self.ru2cc = $.parseJSON( data );
			self.from = self.lang;
			self.lang = lang;

			self.change_lang("*");
		});
	},
	set: function() {	// строит флаги
		var self = this,
			$holder = $("#language"),
			$pool = $( '<div>POOL</div>' ),
			languages = app.data.LANGUAGE;

		$.each( languages, function (idx, item) {
			self.language[ item ] = 1;

			$("<div></div>")
				.attr( "id", "lang-"+ item.code )
				.text( item.name )
				.prepend(
					$("<div></div>")
						.css("background-position", (-(item.id-1)*24 -1) +"px -3px")
				)
				.on( 'click', {
					lang: item.code// переключаемся на другой язык
				}, function (e) {
					var lang = e.data.lang;

					app.util.set_cookie( "lang", lang, 365*20 );

					self.change();
				})
				.on( 'mouseenter', function () {
					$( this ).addClass( "lang-active" );
				})
				.on( 'mouseleave', function () {
					$( this ).removeClass( "lang-active" );
				})
				.appendTo( $pool );
		});
		$pool.children('div')
			.appendTo( $holder );

		$pool.empty();
		this.change();

		$("#language-sel, #language-sel-img").on( 'click', function () {
			$("#language").toggle();
		});

		app.event.add( "loaded", "language", function () {
			app.event.rm( "loaded", "language" );

			self.change_html( "*" );
			self.change();
		});
	},
	gettext: function(ru) {	// перевод фразы
		return this.ru2cc[ ru ] || ru;
	}
};


function _(phrase) {
	return app.lang.gettext(phrase)
}



/*********************************** Опции **************************************/

// Настройка Ajax по умолчанию для всех запросов
$.ajaxSetup({
	//type: 'post',
	dataType: "html"
});

function dialogError (msg, title, escape, buttons) {
	msg = _(msg)
	title = _(title)
	if(escape) $("#error").text(msg); else $("#error").html(msg)
	if(!buttons) buttons = {}
	buttons["Закрыть"] = function() { $(this).dialog("close") }
	$("#error").attr("title", title || "Ошибка!").dialog({
		modal: true,
		buttons: buttons
	})
}



/******************************* Утилиты в общем пространстве имён ***********************************/


function DatDate(date) { return date && new Date(date.replace(/-/g, "/")).date_only() }
function DateDat(date) { return date? $.datepicker.formatDate("yy-mm-dd", date): null }


// функции даты
$.extend( Date.prototype, {
	add: function (d) {				// прибавляет дни к дате
		var x = new Date(0);

		x.setTime(this.getTime() + d*24*3600*1000)
		return x
	},
	inc: function (d) {				// прибавляет дни к этой дате
		this.setTime(this.getTime() + d*24*3600*1000)
		return this
	},
	date_only: function () {			// очищает время
		var x = new Date( this );

		x.setHours(0)
		x.setMinutes(0)
		x.setSeconds(0)
		x.setMilliseconds(0)
		return x
	},
	eq: function(a) {				// сравнивает две даты
		if(!(a && a instanceof Date)) return false
		return this.date_only().getTime() == a.date_only().getTime()
	},
	to: function(to, fn) {	// выполняет переданную функцию от одной даты до другой включительно. Если fn вернёт false, то выполнение прекратится
		for(var i = this.date_only(); i<=to; i.inc(1)) if(fn.call(i) === false) return
	}
});

//  для применения f
//  к каждому элементу списка jquery
//
function repeat(f) {
//  performs badly on IE ?
	return function() {
		var arg = arguments,
			ret, ctx,
			chaining;

		if (this.length != 1) {
			ret = $();
			chaining = repeat.chainContext;

			this.each( function() {// todo memoize pattern
				var $ctx = $( this );

				ret = chaining( f, arg, $ctx, ret );
			});

			return ret.length == 0 ? this : ret
		}
		ctx = f.apply( this, arg );

		return ctx === undefined ? this : ctx;
	}
}
/**
 *
 * @param func
 * @param args
 * @param $ctx
 * @param ret
 * @return {*}
 */
repeat.chainContext = function (func, args, $ctx, ret) {
	var chain = func.apply( $ctx, args );

	if ( chain !== undefined ) {
		$.makeArray( chain, ret );
	}
	return ret;
};


// возвращает ассоциативный массив кук
function cookies(w) {
	if (!w) {
		w = window;
	}
	cookie = w.document.cookie.split('; ');
	
	var i, map = {}
	for(i=0; i<cookie.length; i++) {
		var keyval = cookie[i].split('=')
		map[keyval[0]] = keyval[1]
	}
	return map
}

// переводит натуральное число в заданную систему счисления
function to_radix(n, radix, sep) {
	var x = "", y = ""
	var A = "A".charCodeAt(0) - 10
	var a = "a".charCodeAt(0) - 36
	if(!sep) sep = ""
	for(;;) {
		y = n % radix
		x = (y < 10? String(y):  String.fromCharCode(y + (y<36? A: y<62? a: 128-62))) + sep + x
		if(!( n = parseInt(n / radix) )) break
	}
	return x
}

// парсит число в указанной системе счисления
function from_radix(s, radix) {
	var ch,
		i = 0, len,
		x = 0;

	var _9 = "9".charCodeAt(0)
	var _0 = "0".charCodeAt(0)
	var Z = "Z".charCodeAt(0)
	var A = "A".charCodeAt(0) - 10;
	var z = "z".charCodeAt(0)
	var a = "a".charCodeAt(0) - 36;

	s = String(s);
	for (len = s.length; i < len; i++) {
		ch = s.charCodeAt( i );
		x = x*radix + ch - (ch <= _9 ? _0 :
									ch <= Z ? A :
											ch <= z ? a : 128-62);
	}
	return x
}



// для вставки в html
function escapeHTML(s) {
	return String( s ).replace( /[<>&]/g, function (a) {
		return a == '<' ? '&lt;' : a == '>' ? '&gt;' : '&amp;';
	});
}


// для вставки в строку js
function escapejs(s) {
	return String( s ).replace( /[\\"'\n\r]/g, function (a) {
		return a == "\n" ? "\\n" : a=="\r" ? "\\r" : "\\"+ a;
	});
}


// строка js
function quotejs(s) { return '"'+escapejs(s)+'"' }

//  возвращает строку с представлением объекта - fork toJSON - test-only
app.exports.repr = function(val) {
	var i, s = '',
		a = [];

	if(val === null) return ''+val
	if(typeof val == "object") {
		if(val.valueOf() == "[object Object]" && val.length===undefined) {
			for(i in val) a.push(i+': '+ app.exports.repr(val[i]) )
			return '{'+a.join(', ')+'}'
		}
		if(val.length !== undefined) {
			for(i=0; i<val.length; i++) a.push( app.exports.repr(val[i]) )
			return '['+a.join(', ')+']'
		}
		return val
	}
	if(typeof val == "string") return quotejs(val)

	return ''+val;
}

// выдаёт результат на основе шаблона
app.exports.template = function (tmpl, data) {
	// подготавливает шаблон
	function template_build (tmpl) {
		var js = "s+="+ quotejs( tmpl );

		js = js.replace( /\$(?:\{|%7B)(\w*(?::\w+(?:=[\w\- ]+)*)*)(?:\}|%7D)|\{\{for\s+(\w+)\}\}|\{\{end\s+(\w+)\}\}/g, function (a0, key, from, to) {
			if (key) {
				var helpers = key.split(':')
				var code = "data['"+helpers[0]+"']"
				if(helpers.length == 1) code = "escapeHTML("+code+")"
				else for(var i=1; i<helpers.length; i++) {
					var param = helpers[i].split('=')
					var helper = param[0]
					param.splice(0, 1)
					param = param.length ? ","+ $.map( param, quotejs ).join(",") : ""
					code = 'app.helper.'+helper+".call(st, "+code+param+")"
				}
				return "'+"+code+"+'"
			}
			if(from) return "'\nst.push([data, x, i])\nx = data['"+from+"']\nfor(i=0; i<x.length; i++){\ndata=x[i]\ns+='"
			if(to) return "'\n}\nx = st.pop()\ni=x[2]; data=x[0]; x=x[1]\ns+='"
		})

		var code = new Function( "data", "var x, i, s='', st=[[data]]; "+ js +"; return s" );

		return code;
	}

	var fn = template_build( tmpl );

	return fn( data );
}

// шаблонизатор
$.fn.tmpl = function (data) {
	var mu = this.html();

	return app.exports.template( mu, data );
}
/*$.fn.tmplr = function (data) {
	var mu = this.html();

	return this.html( app.exports.template( mu, data ) );
}*/


// превращает значение в json - todo???

$.toJSON = function (val) {
	var a,
		i, len,
		type_name;

	if ( val === undefined || val === null ) {
		return "null";
	} else {
		type_name = typeof val;
	}

	if ( type_name === "object" ) {
		if ( val instanceof Date ) {
			return quotejs( $.datepicker.formatDate('yy-mm-dd', val) );
		}

		a = [];

		if ( val instanceof Array ) {
			for ( i = 0, len = val.length; i < len; i += 1 ) {
				a.push( $.toJSON( val[i] ) );
			}
			return '['+ a.join(',') +']';
		}

		for (i in val) {
			len = val[ i ];
			if ( typeof len != "function" ) {
				a.push( quotejs( i ) +':'+ $.toJSON( len ) );
			}
		}
		return '{'+ a.join(',') +'}';
	}

	if ( type_name === "string" ) {
		return quotejs( val );
	}

	return ''+ val;
};




/******************************************* Формы *******************************************/
(function() {


	function valid_email (x) {
		ret = String( x.val() )
			.search(/^[^@\s]+@([a-z0-9\-\u00A0-\u024F\u1E00-\u1EFF\u2C60-\u2C7F\uA720-\uA7FF]+\.|[\-\d\u0250-\u1DFF\u1F00-\u2C5F\u2C80-\uA71F\uA800-\uFFFF]+\.)+([a-z0-9]|[\-\d\u0250-\u1DFF\u1F00-\u2C5F\u2C80-\uA71F\uA800-\uFFFF]){2,}$/) != -1;
		return ret;
	}
	function valid_phone (x){
		return x.val().search(/^\+\d+\s*\(\d+\)\s*\d+(-\d+)*$/) != -1
	}

// обработчики валидации
var validate_event = {
	"v-int": ["Введите целое число", function(x) { return x.val() == String(parseInt(x.val())) }],
	"v-real": ["Введите вещественное число", function(x) { return x.val() == String(parseFloat(x.val())) }],
	"v-floor": ["Этаж должен не превышать количества этажей", function(x){
		if (x.val() != String(Math.abs(parseInt(x.val())))) return false
		var count_floor = $("#"+x.attr("id")+"2")
		if (!count_floor.val() && !x.val()) x.prop("priznak",true)
		if (x.prop("priznak")) count_floor.val(x.val())
		if (x.prop("keyup_priznak")) x.prop("keyup_priznak", false)
		else count_floor.prop("keyup_priznak", true).keyup()
		return  parseInt(x.val()) <= parseInt(count_floor.val())
	}],
	"v-count_floor": ["Введите этаж и количество этажей", function(x){ //x.val() == String(parseFloat(x.val()))
		if (x.val() != String(Math.abs(parseInt(x.val())))) return false;
		var floor = $("#"+x.attr("id").slice(0, -1))
		x.prop("priznak",false)
		if (x.prop("keyup_priznak")) x.prop("keyup_priznak", false)
		else floor.prop("keyup_priznak", true).keyup()
		return x.val() == String(Math.abs(parseInt(x.val()))) && parseInt(x.val()) >= parseInt(floor.val())
	}],
	"v-uint": ["Введите натуральное число", function(x) {
		return x.val() == String(Math.abs(parseInt(x.val())))
	}],
	"v-id": ["Введите натуральное число больше 0", function(x) {
		return x.val() == String(parseInt(x.val())) && parseInt(x.val()) > 0
	}],
	"v-ureal": ["Введите вещественное положительное число", function(x) {
		return x.val() == String(Math.abs(parseFloat(x.val())))
	}],
	"v-money": ["Введите стоимость со знаком", function(x) { return x.val() == String(Math.round(parseFloat(x.val())/100)*100) }],
	"v-umoney": ["Введите стоимость: два знака после запятой. Например: 100.22 или 100", function(x) {
		return x.val() == String(Math.abs(Math.round(parseFloat(x.val())*100)/100))
	}],
	"v-city": ["Выберите название города", function(x) { return x.val() == String(Math.abs(parseInt(x.val())))}],
	"v-str": ["Введите хотя бы один символ", function(x) { return $.trim(x.val()).length }],
	"v-skype": ["Skype должен содержать хотя бы один символ", function(x) { return $.trim(x.val()).length }],
	"v-date": ["Введите дату", function(x){
		return x.val().search(/^(\d{4})-(\d{2})-(\d{2})$/)!=-1||x.val()==""
	}],
	"v-str0": ["(*empty*)", function() { return true }],
	"v-email": ["Введите e-mail", valid_email],
	"v-phone": ["Формат телефона: +цифры (цифры) цифры через тире. Например: +7 (921) 333-3-333", function(x){
		return x.val().search(/^\+\d+\s*\(\d+\)\s*\d+(-\d+)*$/) != -1 || x.val()==""
	}],
	"v-login": ["Формат логина: e-mail или телефон, например: +7 (921) 333-3-333", function(x){
		var res
		if(res = valid_email(x)) return res
		return valid_phone(x)
	}],
	"v-hour": ["Диапазон времени от 0 до 23 для часа", function(x){return x.val() == String(parseInt(x.val())) && parseInt(x.val()) > 0 && parseInt(x.val()) < 24}],
	"v-minute": ["Диапазон времени от 0 до 59 для минут", function(x){return x.val() == String(parseInt(x.val())) && parseInt(x.val()) > 0 && parseInt(x.val()) < 60}],
	"v-password": ["Пароль должен быть не менее 6 символов", function(x) { return x.val().length >= 6 }],
	"v-new-password": ["Пароли не совпадают", function(x) {
		return x.val() && $("#"+x.attr("id").slice(0, -1)).val() ==  x.val()
	}]
}


	var validateEventsIterate = function ($ctx) {
		//todo
	};

	var getValidEventImage = function ($ctx) {
		var img = $( "<img class='app-valid-img' />" )
			.attr( "src", app.conf.theme + "img/ok.png" );

		return img.insertAfter( $ctx )
			.qtip( {
				content: "Ввод верен"
			} );
	};

function validateQtipImage (e) {
	var bind_data = e.data,
		msg = bind_data.msg,
		self = $( this ),
		is_valid = bind_data.fn( self );

	var img = self.next(),
		has_valid_source = /ok.png$/i.test( img.attr( "src" ) );

	if( has_valid_source && is_valid || !has_valid_source && !is_valid) {
		return;// переписываем src только если нужно
	}

	if ( is_valid ) {
		self.qtip( "destroy" );
	} else {
		self.qtip({
			content: msg,
			position: {
				my: 'top center', at: 'bottom center'
			},
			style: {
				classes: "ui-tooltip-red"
			}
		});
		//if(self.is(":focus")) self.qtip("show") // показывать tip если фокус на элементе
	}
	img.attr( "src", app.conf.theme +"img/"+ (is_valid ? "ok.png" : "bug.png") )
		.qtip({
			content: is_valid ? "Ввод верен" : msg
		});
}





	// строим список стран с кодом и устанавливаем маску для телефона
	app.exports.phoneCountryMask = {
		set: function ($ctx) {
			var self = this,
				country = app.data.COUNTRY;//   получаем массив стран

			this.createCountrySelector( $ctx, country, 0 );

			var setMask = function (value) {
				var item_idx = 0,
					item_next = true;

				$.each( country, function (i, v) {
					if ( item_next && value.indexOf( v.code ) == 0 ) {
						item_next = false;

						item_idx = i;
					}
					;
				} );

				self.setCountrySelected( $ctx, country[ item_idx ], item_idx );
			};

			$ctx.on( 'keyup',function (event) {
				var value = $ctx.val();

				if ( value ) {
					setMask( value );
				}

				if ( (event.keyCode == 8 && $ctx.data( $.mask.dataName ) && $ctx.mask() == '')
					|| event.keyCode == 27 ) {

					$ctx.val( '' );
					return true;
				}

			} ).one( "focus", function () {
					setMask( $ctx.val() );
				} );
		},
		//  устанавливает маску и флаг для выбранной страны
		setCountrySelected: function (that, country, item_idx) {
			var $ctx = $( that ),
				//  какая страна уже установлена
				prop_country = $ctx.prop( "app-selected-country" );

			// если уже эта же страна, делать ничего не надо
			if (!country || prop_country == false || prop_country == country.code ) {
				return that;
			}

			$ctx.prop( "app-selected-country", country.code );

			// устанавливаем маску
			$ctx.unmask()
				.mask( country.code +" "+ country.mask );//.focus().blur()

			if ( $ctx.is(":focus") ) {
				$ctx.focus().blur();
			}

			// устанавливаем флаг страны
			var sel_div = $ctx.prev()
				.find( ".app-img-phone" );

			sel_div.css( "background-position", -parseInt( item_idx, 10 )*24 +"px 0px" );

			return that;
		}
	};



	function create_item (idx) {
		return $("<div></div>")
			.css( "background-image", "url("+ app.conf.theme +"img/flags.png)" )
			.css( "background-position", "-"+ (idx*24) +"px 0px" );
	}
	function create_container_phone (country) {
		//создаем div для списка кодов стран
		var div = $('<div class="app-container-phone"></div>')
			.hide();

		// создаём div для выбранного кода страны
		for (var i = 0; i < country.length; ++i) {
			$("<div></div>")
				.text( country[i].code )
				.prepend( create_item( i ) )
				.on( 'click', {
					country: country[i],
					item_sel: i
				}, function (e) {
					var country = e.data.country,
						item_sel = e.data.item_sel,
						mask_phone = country.code +" "+ country.mask;

					var div = $(this).parent(),
						sel_div = div.next(),
						x = div.parent().next();

					// сохраняем ввод пользователя (без маски)
					var saved = x.val(),
						code = saved.match(/\d+/);

					code = code ? code[ item_sel ] : '';

					var phone = saved.replace(/\+\d+/, "").replace(/[\(\)\- ]/g,"");

					app.exports.phoneCountryMask.setCountrySelected( x, country, item_sel );

					/*if ( phone != '' ) {
						var str_length = country.mask.match(/9/g).length - phone.length;

						for (var i = 0; i < str_length; i++ ) {
							phone += 0;
						}

						x.unmask().val('')
							.mask( mask_phone )
							.focus().val( phone )
							.blur().focus().blur();
					}*/
					console.log( '\ndebug phone mask\n' );

					x[ 0 ].focus();
					var position_img = $( this ).children("div")
						.css( "background-position" );

					sel_div.css( "background-position", position_img );

					div.hide();
				})//    Меняем стили при наведении
				.on( 'mouseover', function () {
					$( this ).addClass( "app-selected-phone" );
				})
				.on( 'mouseout', function (){
					$( this ).removeClass( "app-selected-phone" );
				})
				.appendTo( div );
		}

		return div;
	}
	function append_container_phone ($ctx, country, callback) {
		var div = $( ".app-container-phone" );

		if ( div.length == 0 ) {
			div = create_container_phone( country );
		}

		$ctx.append( div );

		if ( callback ) {
			callback( div );
		}
	}
	// строит список для стран (с флагом и кодом)
	app.exports.phoneCountryMask.createCountrySelector = function ($ctx, country, item_idx) {

		if ( $ctx.prev().hasClass( "app-over-phone" ) ) $ctx.prev().remove();

		var $item_holder = create_item( item_idx )
			.addClass( "app-img-phone" );

		append_container_phone( $ctx, country );

		var $wrapped = $( "<div class='app-over-phone'></div>" )
			.insertBefore( $ctx )
			.on( 'mouseenter', function () {
				append_container_phone( $( this ), country, function (container) {
					container.show();
				});
			})
			.on( 'mouseleave', function () {
				$( ".app-container-phone" ).hide();
			})
			.append( $item_holder );

		if (!item_idx || $ctx.prop( "app-selected-country" ) == true ) {
			app.exports.phoneCountryMask.setCountrySelected( $ctx, country[ 0 ], 0 );
		}
	};





// устанавливает обработчики валидации
$.fn.validate = function () {
	
	return this.find("input, textarea, select").each( function() {
		var $ctx = $( this ),
			item = this.tagName;

		if ( $ctx.next().hasClass( "app-valid-img" ) ) return;

		if ( $ctx.hasClass( "v-phone" ) ) app.exports.phoneCountryMask.set( $ctx );

		if ( item == "TEXTAREA" ) $ctx.autoResize();
		else if ( item == "INPUT" ) {
			item = this.type;
			if ( item == "button" || item == "submit" || item == "reset" ) {
				$ctx.button();
			}
		}

		var prop,
			img;

		for (prop in validate_event) {
			if ( validate_event.hasOwnProperty( prop ) && $ctx.hasClass( prop ) ) {

				item = validate_event[ prop ];

				var msg = {
					msg: item[0],
					fn: item[1]
				};

				$ctx.on( 'keyup', msg, validateQtipImage );
				$ctx.bind( "input", msg, validateQtipImage );//??? todo

				/*/ deprecated as useless
					was for what?? - and why interval
				if ( $.browser.msie ) {
					setInterval( function () {
						validateQtipImage.call( $ctx[0], {
							data: msg   //a'so mutable in closure
						} );
					}, 250 );
				}*/

				img = getValidEventImage( $ctx );
				if ( $ctx.hasClass( "on" ) ) {
					img.addClass( "on" );
				} else if ( $ctx.hasClass( "off" ) ) {
					img.addClass( "off" );
				}
			}
		}

		$ctx.keyup();
	});
};


// смотрит - валидны ли элементы
$.fn.valid = function () {
	var res = true,
		tag = this[0].tagName.toString();

	function test_valid () {
		var $ctx = $( this ),
			inp;

		if ( !$ctx.hasClass( "app-valid-img" ) ) {
			return;
		}

		inp = $ctx.prev()
			.keyup();

		if ( $ctx.attr( 'src' ).search( /ok.png$/ ) == -1 ) {
			inp.qtip( "show" );
			res = false;
			return false;
		}
	}

	if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
		this.next().each( test_valid );// элемент
	} else {
		this.find( "input, textarea, select" )
			.next().each( test_valid );// форма
	}

	return res;
};



	/**
	 * function set_value helper
	 *
	 * @param *
	 */
	var set_value_iterated_tpls = {
		'create_p': function (item) {
			var p;

			p = $("<p></p>")
				.text( item.name );

			return p;
		},
		'create_option': function (item) {
			var option;

			option = $("<option></option>")
				.text( item.name )
				.attr( "value", item.id );

			return option;
		}
	};
	/**
	 *
	 * @param $ctx
	 * @param sel
	 * @param name
	            * @param name_sel
	 * @param tpl.name && callback
	 */
	function set_value_iterated ($ctx, sel, name, name_sel, tpl) {
		var i = 0,
			len = sel.length,
			item,
			$node;

		$ctx.html('');

		for (; i < len; ++i) {
			item = sel[ i ];

			$node = set_value_iterated_tpls[ 'create_'+ tpl.name ].appendTo( $ctx );
			if ( tpl.callback ) {
				//tpl.callback( $node, item )
				$node.prepend( $("<input type='checkbox' name='"+ name_sel +"[]' value = "+ item.id +">") );
				$node.append( $("<span id="+ name + item.id +"></span>") )
			}
		}
	}

// устанавливает данные в элемент переданный в this
function set_value (dat) {
	var tag = this.tagName.toString(),
		$ctx = $( this ),
		i, item, len,
		ctx_class = $ctx.attr( 'class' ),
		p,
		name = $ctx.attr( "name" ),
		name_id = name.replace( /_id$/, '' ),
		name_sel = name_id +"_sel",
		val = dat[ name ],
		sel = dat[ name_sel ];

	if ( val === null )	val = '';

	if ( !(typeof sel === "object" && sel instanceof Array) ) {		// пытаемся выбрать из переменной data. Она инициализируется в head.html
		sel = app.data[ name_id.toUpperCase() ]
		if(sel && sel[0].id) sel = [{id:'', name:_( "-- не выбрано --" )}].concat( sel )
	}
	
	if (tag === "DIV" && /_id$/.test(name) && sel) {
		$ctx.html('');

		for (i = 0, len = sel.length; i < len; ++i) {
			item = sel[ i ];

			p = $("<p></p>")
				.text( item.name )
				.appendTo( $ctx );

			p.prepend( $("<input type='checkbox' name='"+ name_sel +"[]' value = "+ item.id +">") );
			p.append( $("<span id="+ name + item.id +"></span>") )
		}/*
		set_value_iterated( $ctx, sel, name, name_sel, {
			name: 'p',
			callback: function ($node, item) {
				//p.prepend( $("<input type='checkbox' name='"+ name_sel +"[]' value = "+ item.id +">") );
				//p.append( $("<span id="+ name + item.id +"></span>") )
			}
		});*/

	} else if (tag === "DIV" && ctx_class === 'star') {
		$ctx.parent()
			.find('.star_' + val).prevAll().andSelf()
			.removeClass("ratings_vote").addClass('ratings_over');

		$ctx.parent()
			.find('.star_' + val).nextAll()
			.removeClass("ratings_over");
	}

	else if (tag === "INPUT" && this.type == "radio" && this.value==dat[name]){ this.checked = true}
	else if (tag === "INPUT" && this.type == "radio" && this.value!=dat[name]){ this.checked = false}
	else if (tag === "SELECT" && /_id$/.test( name ) && sel) {
		$ctx.html('');

		for (i = 0, len = sel.length; i < len; ++i) {
			item = sel[ i ];

			$("<option></option>")
				.attr( "value", item.id )
				.text( item.name )
				.appendTo( $ctx );
		}/*
		set_value_iterated( $ctx, sel, name, name_sel, {
			name: 'option'
		});*/

		$ctx.val( val )
			.focus()
			.keyup().blur();

	} else if (this.value !== undefined) {
		$ctx.val( val )
			.focus()
			.keyup().blur();

	} else if (tag === "A") {

		if ( (name.toLowerCase() !== 'href_id') && val ) {
			this.href = val;
		} else {//for lists
			//  $ctx.removeAttr('href');
		}

	} else if ( tag === "IMG" ) {
		if ( val ) {
			this.src = val;
		}
	} else {
		//  is a bug of textarea?
		$ctx.html( $ctx.text( val ).text().replace(/\n/g, "<br>") );
	}
}




// возвращает данные из всех [name], а не только input
$.fn.rowData = function () {
	var data = {};

	this.find( "[name]" ).each( function () {
		var $ctx = $( this );

		data[ $ctx.attr( "name" ) ] = $ctx.text();
	});
	return data;
}

// возвращает или устанавливает данные формы
//
//(function () { loose this context inside wrap
var getNamed = function ($ctx, $named) {
	if ( $named ) {
		return $named;
	}
	return $ctx.find( "[ name ]" );
};

$.fn.setFormData = function (data, $named) {
	$named = getNamed( this, $named );

	$named.each( function() {
			set_value.call( this, data );
		})
		.filter( 'input, select, textarea' )
		.focus()
		.keyup().blur();

	return this;
}
$.fn.getFormData = function (data, $named) {
	$named = getNamed( this, $named );

	data = {};
	$named.each( function () {
		if ( this.value !== undefined ) {
			data[ this.name ] = this.value;
		}
	});
	return data;
}



// синхронизирует подчинённого с формой
function minor_sync(options, data) {
	if(!options.minor) return;

	if (!data ) {
		data = options.form.getFormData();
	}
	for (var i in data) {
		options.minor.find('[name='+i+']').each(function() {
			if(this.value !== undefined) this.value = data[i]
			else $(this).text(data[i])
		})
	}
}

	var FormCommands = {
		// создаёт новую запись
		new_record: function (options) {
			var event = options.event,
				//  warning closure!
				callMethod = function (ctx_method, ctx_data) {
					return ctx_method.call( options.form, options, ctx_data, "new" );// event
				};

			if ( callMethod( event.store, {} ) === false ) {
				return;
			}

			$.post( options.store, function (data) {
				data = $.parseJSON( data );

				options.form.form( "data", data );
				callMethod( event.store_success, data );
			})
		}
	}


// события для формы
// ставится на <input type=submit> или на форму, если нет элемента submit, для сохранения
function form_submit(e) {
	var form = e.data
	var options = form.get(0).options
	var title = options.msg.store.title || options.name

	if(!form.valid()) {
		dialogError(options.msg.store.error, title, 1)
		return false
	}

	var data = form.getFormData();

	if(options.event.store.call(form, options, data) === false) return false	// event
	$.post(options.store, data, function(data) {
		data = $.parseJSON(data)
		form_set_id(form, data.id)
		minor_sync(options)	// синхронизируем подчинённого
		if(options.event.store_success.call(form, options, data) === false) return;
		var msg = options.msg.store.success
		if(msg) dialogError(msg, title, 1)
	})
	return false
}


	// возвращает id формы todo expensive
	function form_get_id (form) {
		return form.find("[name=id]:first").val();
	}
	function form_set_id (form, id) {
		if ( id != 0 ) {
			form.find("[name=id]:first").val( id );
		}
	}


// сохраняет указанный элемент
function form_input_store(form, options, inp) {
	var img = inp.next()
	var data = options.params;
	$.extend(data,{id: form_get_id(form)})		
	//получаем дату загрузки формы
	var changed = form.find("[name=time_change]:first").val()
	if( changed !==null ) data["time_change"] = changed
	data[inp.attr("name")] = inp.val()
	if(options.event.store.call(form, options, data) === false) return;	// event
	$.ajax({
		url: options.store,
		type: 'post',
		data: data, 
		success: function(data) {
			data = $.parseJSON(data)
			form_set_id(form, data.id)
			//устанавливает time_change в форме
			form.find("[name=time_change]:first").val(data.time_change)
			img.attr("src", app.conf.theme+"img/save_ok.png")
			img.qtip({content: "Данные сохранены"})
			var x = {}
			x[inp.attr('name')] = inp.val()
			minor_sync(options, x);
			// event
			options.event.store_success.call(form, options, data);
		},
		error: function(jqXHR, ajaxSettings, thrownError) {
			var json
			try { json = $.parseJSON(jqXHR.responseText) } catch(e) {}
			if(json && json.data) eval(json.data.fn)(json.data.ret)
			if(json && json.message) img.qtip(json.message)
			else img.qtip(jqXHR.responseText)
			img.attr("src", app.conf.theme+"img/error.png")
		}
	});
}

// ставится на элементы формы для сохранения каждого элемента отдельно
function form_input_change(e) {
	var form = e.data
	var options = form.get(0).options
	var inp = $(this)
	var img = inp.next()
	if(String(img.attr("src")).search(/ok.png/)==-1) {
		img.attr("src", app.conf.theme + "img/error.png")
		return
	}
	img.attr("src", app.conf.theme + "img/save.png")
	form_input_store(form, options, inp)
}

// ставится на кнопку .app-form-erase-btn	
function form_input_erase (e) {
	var form = e.data,
		options = form.get(0).options,
		title = options.msg.erase.title || options.name;

	if ( form_get_id( form ) == 0 ) {
		dialogError(options.msg.erase.error, title, 1)
		return;
	}

	dialogError( options.msg.erase.confirm, title, 1, {
		"Удалить": function() {
		if (options.event.erase.call(form, options) === false) return;

		$.post( options.erase, {id: form_get_id( form ) }, function (data) {
			if ( options.minor ) options.minor.remove()

			form.form( "reset" );
			if (options.event.erase_success.call(form, options, data) === false) {
				$( "#error" ).dialog( "close" );
				return;
			}

			// если форма так же является оверлеем - закрываем её
			if ( options.overlay ) {
				options.overlay.overlayDialog( "close" );
			}
			dialogError( options.msg.erase.success, title, 1 );
		});
	}
	});
}

// загружает данные формы
function form_load (options, id) {
	var form = options.form,
		event = options.event;

	if ( event.load.call( form, options, id ) === false ) {
		return;
	}

	form_set_id( form, id );

	$.post( options.load, {
		id: form_get_id( form )
	}, function (data) {
		var event = options.event;

		data = $.parseJSON( data );

		if ( event.loaded.call( form, options, data ) === false ) {
			return;
		}

		form.setFormData( data );

		if ( options.minor ) {
			options.minor.setFormData( data );
		}
		event.load_success.call( form, options, data );
	})
}

/** устанавливает обработчики сохранения и валидации на элементы формы с атирбутом name
вместо формы может использоваться обычный div. Но в таком случае клавиша Enter как submit работать не будет
если в форме есть <input type=submit>, то форма будет отправляться вся по submit
иначе - каждое поле сохраняется отдельно
*/
$.fn.form = repeat( function (av, p1, p2) {
	var data,
		//  получаем привязанные к форме опции при прошлом вызове form
		options = this.get( 0 ).options;
		
	if (!av ) av = {};
	
	//  todo command block
	if ( typeof av === "string" ) {
		if (av === "reset") {
			this.find( "input,select,textarea" )
				.filter("[type!=button]")
				.filter("[type!=submit]")
				.filter("[type!=reset]")
				.val('').keyup();
		} else if (av === "destroy") {
			delete this.get(0).options
		} else if (av === "id") {
			return form_get_id( this );
		} else if (av === "data") {
			return this[ p1 ? 'setFormData' : 'getFormData' ]( p1 );
		} else if (av === "val") {
			if ( p2 === undefined ) {
				return this.find("input[name="+p1+"],select[name="+p1+"],textarea[name="+p1+"]").val();
			}

			if ( typeof p2 === "object" ) data = p2;
			else {
				data = {};
				data[ p1 ] = p2
			}
			var elem = this.find( "[name="+ p1 +"]" );
			set_value.call( elem[0], data );
			elem.focus()
				.keyup().blur();
		} //else if(av == "add_input") p1.change(this, form_input_change)
		  else if ( av === "load" ) {
			form_load( options, p1 );
		} else if ( av === "store" ) {
			if ( p1 ) {
				form_input_store( this, options, this[0].elements[ p1 ] );
			} else {
				form_submit({
					data: this
				});
			}
		} else if ( av === "new") {
			FormCommands.new_record( options );
		} else if ( av === "erase") {
			form_input_erase({
				data: this
			});
		} else if ( av === "params" ) {
			$.extend( options.params, p1 );//???
		} else if ( av === "sync" ) {
			if ( p1 ) {
				data = {};
				data[ p1 ] = this[0].elements[ p1 ].value;

				minor_sync( options, data );
			} else {
				minor_sync( options );
			}
		} else {
			throw 'Нет команды form("'+av+'")'
		}
		return;

	} else if ( options ) {
		this.get(0).options = $.extend( true, options, av, {
			form: this
		});
		return;
	}


	// возвращает опции, если они есть в элементе
	var getOpts = function ($node) {
		var opts = $.trim( $node.text() );

		if (!opts ) {
			return {};
		}
		return $.parseJSON( "{"+ opts +"}" );
	};
	//  опции из div.app-form-opt
	var opt = getOpts( this.find( ".app-form-opt" ) ),
		className = this.get( 0 ).className,
		// опции из атрибутов формы
		f_opt = {
			url: this.attr( "action" ),
			overlay: this.hasClass( "app-overlay" ) ? this : null,
			name: this.attr( "name" ) || ''
		};

	// собираем все опции вместе
	av = $.extend( true, f_opt, opt, av, {
		form: this
	});

	// добавляем те опции, которых не хватает
	options = {
		url: av.url,						// url для операций
		load: av.url +"/load",	// откуда загружать
		store: av.url +'/store',	// куда сохранять
		erase: av.url +'/erase',	// удалить

		// связанная форма - синхронизировать при изменениях
		minor: av.minor,
		params: {},
		id: av.id,		// только для инициализации 
		name: av.name,	// только для стандартных сообщений
		msg: {
			store: {
				title: "Сохранение " + av.name,
				error: "Не все поля заполнены верно",	// сообщение на ошибку валидации
				success: "Сохранение "+av.name+" завершилось успешно"
			},
			erase: {
				title: "Удаление " + av.name,
				error: av.name+" нельзя удалить",
				confirm: "Вы действительно хотите удалить "+av.name+"?",
				success: "Удаление "+av.name+" завершилось успешно"
			}
		},
		event: {
			load: $.noop,			// начало загрузки. Может отменить её - return false
			loaded: $.noop,			// вызывается перед установкой данных форме, получает ссылку на данные, может отменить установку данных
			load_success: $.noop,	// данные установлены
			store: $.noop,
			store_success: $.noop,
			erase: $.noop,
			erase_success: $.noop
		}
	};

	$.extend( true, options, av );
	//  сохраняем опции
	this.get(0).options = options;
	
	// ставим валидацию и сохранение на все элементы формы
	var elements = this.validate(),//   side-effect
		submit = this.find( "input[ type=submit ]" );

	if ( submit.length ) {
		// в форме есть submit - ставим на форму субмит
		if ( this.get(0).tagName == "FORM" ) {
			this.submit( this, form_submit );
		} else {
			submit.click( this, form_submit );
		}
	} else {
		elements.filter( "[name]:not([m_change=on])" )
			.change( this, form_input_change );// в форме нет submit - каждый элемент сохраняется отдельно
	}

	// на удаление
	this.find( ".app-form-erase-btn" )
		.click( this, form_input_erase );
});

/******************************************* Инициализатор *******************************************/

// распознаёт классы и т.п. у элементов
// и выполняет над ними соответствующие конструкторы
//  @param {object} custom - дополнительные параметры по инициализации структур( metro )
//
$.fn.pluginInit = function (custom) {
	var multi = this.find( ".app-multi" ),
		form = this.find( ".app-form" ),
		tab = this.find( ".app-tab" ),
		dialog = this.find( ".app-dialog" ),
		overlay = this.find( ".app-overlay" ),
		btn = this.find( ".app-btn" ),
		bt = this.find( ".app-bt" ),
		qtip = this.find( ".app-qtip" ),//@armoring
		acc = this.find( ".app-acc" );

	qtip.each( function() {
		var $ctx = $(this);

		$ctx.parent().qtip({
			content: {
				text: $ctx
			}
		});
	});

	tab.tabs({
		//  add custom event for e.g. app.overlay.addOwl support
		event: "owl.show click"
	}).bind('tabsshow', function (e, ui) {
		console.log("Нужно изменить app.hash // pluginInit tabsshow")
		//if (this.id == 'realty') realtyTabs.update( location.hash, ui.index );
	});

	dialog.dialog({
		autoOpen: false,
		modal: true
	});

	if ( custom && custom.hasOwnProperty('overlayParams') ) {
		overlay.overlay( custom['overlayParams'] );
	} else {
		//  todo trace {href="#} main usecase
		overlay.overlay( {} );
	}

	form.form();
	multi.multi();

	btn.buttonset();
	bt.button();
	acc.accordion();

	return this;
};


/*********************************** Список *************************************
 * $.fn.list
 *
 * */
(function () {
	var itemClickHandlers = {
		owlCallback: function (dom_ctx) {
			var idx = $( dom_ctx ).attr( 'list_id' );
			console.log("@core.js:2096 - убрать")
			//app.overlay.addOwl( '/realty', idx, true );
		},
		setCallback: function (fn) {
			this.callback = fn;
		},
		callback: $.noop,
		resetCallback: function () {
			this.setCallback( this.owlCallback );
		}
	};
	itemClickHandlers.resetCallback();
	app.exports.ListItemClickHandlers = itemClickHandlers;


	var hashListOverlayFlyweight = {
		proxyOwl: app.overlay,
		proxyGet: app.exports.owlsGet,
		proxyUpdate: app.exports.owlsUpdate,
		//  @bind external
		//
		itemClickHandler: function () {
			itemClickHandlers.callback( this );
		},
		current_list:{
			id: '',
			offset: 0
		},
		//  cases for [#]list=, #..[!]list=, #..[/]list=
		//
		addList: function (id, offset) {
			/*var hash = location.hash,
				has_list = /[\#\!\/]+list=/.test( hash ),
				levels = this.proxyGet( hash );

			if ( has_list ) {
				console.log('[new_Warn]list ='+ id +'='+ offset +'{offset} @levels='+ levels.length );
			} else {
				console.log('[_no_]list ='+ id +'='+ offset );
				//  is current
				if (!levels || levels.length == 1) {
					hash = '#list='+ id +'='+ offset + (!hash ? '' : ('!' + hash) );
				}
				//  or use proxyUpdate?
				app.overlay.setIgnoreOnce( hash );
			}*/
		},
		/**
		 *
		 * @param levels
		 * @return {object} item
		 */
		getListItem: function (levels) {
			var seq = levels[ levels.length -1 ].seq,
				len = seq.length,
				item;

			for (; len-- ;) {
				item = seq[ len ];
				if (item.name === 'list') break;
			}

			return item;
		},
		getFilterItemIndex: function ( prop, list_item ) {
			var len = list_item.length,
				item;

			for (; len-- ;) {
				item = list_item[ len ];

				if (item === prop) break;
			}

			return len > 0 ? len : false;
		},
		modifyFilterParam: function (prop, value, item) {
			var idx = this.getFilterItemIndex( prop, item.args );

			if ( idx && value ) {
				item.args[ idx +1 ] = value;
			} else {
				if ( value ) {
					item.args.push( prop );
					item.args.push( value );
				} else if ( idx ) {
					item.args.splice( idx, 2 );//   by pair
				}
			}

			return item;
		},
		//  todo make aliases
		list_filter_params: [// order number_room flt-from-dp flt-to-dp...
			'cena_from cena_to',
			' equipment form_id number_bed'
		].join('').split(' '),
		/**
		 *
		 * @param params
		 * @param item
		 */
		addListFilterParams: function (params, item) {
			var self = this,
				value;

			$.each( this.list_filter_params, function (idx, prop) {
				if ( params.hasOwnProperty( prop ) ) {
					value = params[ prop ];

					item = self.modifyFilterParam( prop, value, item );
				}
			});
			return item;
		},
		/**
		 *
		 * @param {object} state
		 * @param {number} id -обновляемый список( current_id )
		 * @param {number} upto -устанавливаемое смещение( offset )
		 */
		updList: function (state, id, upto, params) {
			/*var hash = location.hash,
				levels = this.proxyGet( hash ),
				item = this.getListItem( levels );

			if ( item ) {
				item.args[ 1 ] = upto;
				state.offset = upto;

				//  ignoring( of equal id ) offsets like state.offset !== offset
				if ( state.id !== id ) {
					item.args[ 0 ] = id;
					state.id = id;
				}

				item = this.addListFilterParams( params, item );
				this.proxyUpdate( levels );
			}*/
		},
		//  @exposed
		//
		getOptOffset: function (params, id) {
			var state = this.current_list,
				offset = params.offset;

			if ( state.id === '' ) {
				this.addList( id, offset );

				state.id = id;
				state.offset = offset;
			} else {
				this.updList( state, id, offset, params );
			};
		}
	};
	app.exports.hashListOverlayFlyweight = hashListOverlayFlyweight;


	var scrl = {
		step: 40,
		stop: function (param) {
			param.disabled = true;
		},
		enable: function (param) {
			param.disabled = false;
		},
		heightBounds: function (param) {
			var scroll = param && param.scroll ? param.scroll : false,// not undefined +)
				$ctx = scroll ? scroll : $( window ),
				height = scroll ? $ctx.prop( 'scrollHeight' ) : $( '#body' ).height();

			return {
				ctx: $ctx,
				content: height,
				window: $ctx.height()
			};
		},
		start: function (param, callback) {
			var heights = this.heightBounds( param );

			this.enable( param );

			if ( heights.window >= heights.content ) {
				callback();
			}
		},
		main: function (that, callback) {
			var heights,
				//  todo replace _that_ with callback.getContextOpts
				param = that[0].list_opt;

			if (!param.disabled) {
				heights = this.heightBounds( param );

				if( (heights.ctx.scrollTop() + this.step) > (heights.content - heights.window) ) {
					callback();
				}
			}
		}
	};


	function elem_paste (idx, row, before, callbackSelf, is_command) {
		var self = callbackSelf(),
			opt = self[0].list_opt;

		if (opt.paste.call(self, row) === false) {
			return;
		}
		var div = $( opt.elem )
			.removeAttr( "id" )
			.clone( true );

		div.setFormData( row )
			.attr( "list_id", row.id )
			.removeClass("template");

		opt.pasted.call( self, div, row, idx );

		if ( is_command ) {
			//  one branch is dead
			if ( before ) {
				div.prependTo(self);
			} else {
				div.appendTo(self);
			}
		} else {
			return div;
		}
	}


	/**
	 *
	 * @param data
	 * @param opt
	 * @param callbackSelf
	 * @param {function} callbackLoad
	 */
	function callbacko (data, opt, callbackSelf, callbackLoad ) {
		var arr = listParams.getDataParsed( data ),
			self = callbackSelf(),
			$pool = $( '<div>POOL</div>' ),
			item;

		if ( opt.loaded.call( self, arr ) == false ) {
			scrl.start( opt, callbackLoad );
			return;
		}

		$.each( arr, function (idx, row) {
			item = elem_paste( idx, row, false, callbackSelf );

			if ( item ) {
				item.appendTo( $pool );
			}
		} );

		opt.param.offset += arr.length;
		if ( item ) {
			//  does not delegate to 'a[ name=href_id ]'
			$pool.children('div').on( 'click', hashListOverlayFlyweight.itemClickHandler )

			$pool.children('div').appendTo( self )

			$pool.empty();
		}

		if ( arr.length == opt.param.limit ) scrl.start( opt, callbackLoad );
		opt.loadend.call( self, arr );
	}


	var listParams = {
		/**
		 * @return {Array}
		 */
		getDataParsed: function (data) {
			data = $.parseJSON( data );

			if ( $.isPlainObject( data ) ) {	//  is always tests for?

				if (data.fn) {
					eval( data.fn )( data.ret );
				}

				data = data.arr;
			}

			return app.util.rowsToArrayOpt( data );
		},
		getOptMsg: function (opt, command) {
			var msg,
				current_params = opt.param;

			if ( current_params.hasOwnProperty( 'my' ) ) {
				msg = current_params.my;

				if ( command === 'offset' ) {
					hashListOverlayFlyweight.getOptOffset( current_params, msg );
				}
			} else {
				msg = opt.url;
			}
			return msg;
		},
		getOpt: function (that, command) {
			var opt, msg = ' Zzz.. ';

			if ( that[0] && that[0].hasOwnProperty('list_opt') ) {
				opt = that[0].list_opt;

				if ( opt.hasOwnProperty( 'param' ) ) {
					msg = this.getOptMsg( opt, command );
				}

				msg = (command === 'create') ? ('[list]@ '+ msg) : ('[list]> '+ command +'_@'+ msg);
				console.log( msg );
			}
			return opt;
		},
		opts: null,
		init: function (that, opt, cmd) {
			var params = {
				//  адрес котроллера серверной части( back-end )
				url: '/api/no',
				//  параметры запроса - можно добавить сюда свои
				param: {
					offset: 0,	// количество элементов списка
					limit: 10	// сколько элементов запрашивать на страницу
				},
				// при создании отключено
				disabled: true,

				// шаблон элемента списка
				elem: null,
				// элемент содержащий список и имеющий полосы прокрутки
				scroll: null,
				// обработчики событий
				load: $.noop,	 // на загрузку
				loaded: $.noop, //  загрузка завершилась удачно
				// элементы вставлены
				loadend: $.noop,
				paste: $.noop,	//до вставки очередного элемента
				pasted: $.noop	//после вставки очередного элемента
			};

			console.log( 'new params' );

			// currently not cached opts - trace cmd? no need
			return this.opts = that[0].list_opt = params;
		},
		clearSelf: function (that, opt) {
			var is_table = that.prop( 'tagName' ) === 'TABLE',
				that_children = is_table ? that.children('tbody') : that;

			opt.param.offset = 0;

			that_children.children()
				.remove();
		}
	};



	//  with closure side-effects - todo extract load method
	//
	//  $.fn.listCreate = repeat( function (params) {
	//	  is used with single params object
	//
	$.fn.listCreate = function (params) {
		var cmd = 'create',
			self = this,
			callbackSelf = function () {
				return self;
			},
			opt = listParams.getOpt( self, cmd ),
			callbackLoad = function () {
				load();
			};


		function load() {
			var opt = listParams.getOpt( self, 'offset' );

			// отключаем, чтобы не подкачивало 10 раз
			scrl.stop( opt );

			if ( opt.load.call( self, opt ) === false ) {
				scrl.start( opt, callbackLoad );
				return;
			}

			$.get( opt.url, opt.param, function (data) {
				callbacko( data, opt, callbackSelf, callbackLoad );
			});
		}


		if(!opt) {
			opt = listParams.init( self, opt, cmd );
		} else {
			listParams.opts = opt;
		}

		$.extend( true, opt, params );

		scrl.heightBounds( opt )
			.ctx.scroll( function (e) {
				scrl.main( self, callbackLoad );
			} );

		return self;
	};


	/**
	 * new version for
	 *
	 */
	$.fn.list = repeat( function (cmd, p1) {
		var self = this,
			callbackSelf = function () {
				return self;
			},
			opt = listParams.getOpt( self, cmd ),
			callbackLoad = function () {
				load();
			};

		function load () {
			var opt = listParams.getOpt( self, 'offset' );

			// отключаем, чтобы не подкачивало 10 раз
			scrl.stop( opt );

			if ( opt.load.call( self, opt ) === false ) {
				scrl.start( opt, callbackLoad );
				return;
			}

			$.get( opt.url, opt.param, function (data) {
				callbacko( data, opt, callbackSelf, callbackLoad );
			});
		}

		if (!opt) {
			opt = listParams.init( self, opt, cmd );

			console.log( 'never init\n');// todo remove this part
		} else {
			listParams.opts = opt;
		}
		//console.log( opt.param );


		if (cmd === "disable") {
			// отключает подгрузку списка
			scrl.stop( opt );

		} else if (cmd === "enable") {
			// включает подгрузку списка
			scrl.start( opt, callbackLoad );

		} else if (cmd === "paste") {
			// вставляет элемент в конец списка
			elem_paste(0, p1, 0, callbackSelf, true );
		} else if (cmd === "insert") {
			// вставляет элемент в начало списка
			elem_paste(0, p1, 1, callbackSelf, true );

		} else if (cmd === "clean") {
			// очищает список
			listParams.clearSelf( self, opt );

		} else if (cmd === "refresh") {
			//  очищает и подгружает
			listParams.clearSelf( self, opt );
			load();
		} else if (cmd === "update") {
			listParams.clearSelf( self, opt );
			// подгружает элементы со смещением и прочими свойствами

			opt.param = $.extend( opt.param, p1 );
			load();

		} else if (cmd === "load") {
			// подгружает для справочника@ref_init

			console.log('ref_init with '+ p1);
			load();
		} else {
			throw "list: Неверная команда `"+ cmd +"`"
		}
	});

}());



	/**
	 *  возвращает элемент списка по его id
	 */
	$.fn.listGetItemById = repeat( function (id) {
		//console.log( '[list]GetItemById @'+ id );
		return this.find("[list_id="+ id +"]");
	});



	/**
	 *  $.fn.list old bundle todo for ref implementation
	 */
	$.fn.listOldBundle = repeat( function (av, p1) {

		var self = this,
			opt = this[0].list_opt;

		if(!opt) {
			opt = {
				url: '/api/no',	// url по которому запрашиваются страницы
				param: {		// параметры запроса - можно добавить сюда свои
					offset: 0,		// количество элементов списка
					limit: 10		// сколько элементов запрашивать на страницу
				},
				// элемент - шаблон элемента списка
				elem: null,
				// элемент содержащий список и имеющий полосы прокрутки
				scroll: null,
				// при создании отключено
				disabled: true,
				// обработчики событий
				load: $.noop,	 // на загрузку
				loaded: $.noop, //  загрузка завершилась удачно
				// элементы вставлены
				loadend: $.noop,
				paste: $.noop,	//до вставки очередного элемента
				pasted: $.noop	//после вставки очередного элемента
			};
			this[0].list_opt = opt;

			h().scroll
				.scroll(scroll);
		}

		function elem_paste(idx, row, before) {
			if (opt.paste.call(self, row) === false) return;

			var div = $(opt.elem).clone(true).removeAttr("id");

			if(before) div.prependTo(self); else div.appendTo(self)

			div.setFormData( row ).removeClass("template").attr("list_id", row.id)
			opt.pasted.call(self, div, row)
		}

		function load() {
			// отключаем, чтобы не подкачивало 10 раз
			scroll_stop();
			if ( opt.load.call( self, opt ) === false ) {
				scroll_start();
				return
			}

			$.get(opt.url, opt.param, function(data) {
				data = $.parseJSON(data)
				if ($.isPlainObject(data)) {
					if(data.fn) eval(data.fn)(data.ret)
					data = data.arr
				}
				var response = app.util.rowsToArrayOpt( data );
				if(opt.loaded.call(self, response) == false) { scroll_start(); return; }

				$.each(response, elem_paste);

				opt.param.offset += response.length
				if(response.length == opt.param.limit) scroll_start();
				opt.loadend.call(self, response)
			})
		}

		function h() {
			var opt_scroll = opt.scroll,
				$ctx = opt_scroll ? opt_scroll : $( window ),
				height = opt_scroll ? $ctx.prop( 'scrollHeight' ) : $( '#body' ).height();

			return {
				window: $ctx.height(),
				content: height,
				scroll: $ctx
			};
		}

		function scroll(e) {
			if(!opt.disabled && h().scroll.scrollTop() > h().content-h().window-20) load()
		}

		function scroll_start() {
			if(h().window >= h().content) load()
			opt.disabled = false
		}

		function scroll_stop() {
			opt.disabled = true
		}

		function clean() {
			opt.param.offset = 0;

			if(self.prop("tagName") == "TABLE") self.children("tbody").children().remove();
			else self.children().remove()
		}


		if(typeof av == "object") {
			$.extend(true, opt, av)
		} else if(av == "id") {				// возвращает элемент списка по его id
			return this.find("[list_id="+p1+"]")
		} else if(av == "clean") {		// очищает список
			clean()
		} else if(av == "disable") {	// отключает подгрузку списка
			scroll_stop()
		} else if(av == "enable") {	// включает подгрузку списка
			scroll_start()
		} else if(av == "paste") {		// вставляет элемент в конец списка
			elem_paste(0, p1)
		} else if(av == "insert") {		// вставляет элемент в начало списка
			elem_paste(0, p1, 1)
		} else if(av == "load") {		// подгружает
			load(p1)
		} else if(av == "refresh") {	// очищает и подгружает
			clean()
			load()
		} else throw "list: Неверная команда `"+av+"`"
	});





/****************************** Таблица с добавл. и удал. строками *******************************/
$.fn.multi = repeat(function(av, p1) {
	var self = this,
		opt = this[0].multi_opt;

	if (!opt ) { // конструируем
		this.find("tr").append(
			$("<td>").append("<input type=hidden name=id value=0>").append(
				$("<img>")
					.attr("src", app.conf.theme+"img/erase.png")
					.addClass("app-form-erase-btn")
			)
		);
		this.after( $("<img>")
			.attr("src", app.conf.theme+"img/add.png")
			.qtip( "Добавить" )
			.on( 'click', function () {
				self.multi( "add", 1 );
			})
		);
		av = av || {}
		opt = this.get(0).multi_opt = {
			event: {
				erase_success: function () {
					if (this.next().length || this.prev().length) this.remove();
					return false;
				},
				paste: $.noop,
				multi_add: $.noop,
				before_add: $.noop
			}
		}
	}
	if(typeof av == "object") {
		$.extend(true, opt, av)
		this.find("tr").form(opt)
		if (opt.hide_buttons){
			if (this.next().is("img")) this.next().remove()
			this.find(".app-form-erase-btn").remove()
		}
	} else if(av == "data") { // устанавливает данные. В p1 - массив. Если не хватает строк, то добавляет
		this.multi("clean")
		var k = p1.length - 1
		this.multi("add", k)
		this.find("tr").each(function(idx) { 
			if(opt.event.paste.call(this, p1[idx]) === false) return false
			$(this).form("data", p1[idx])
		})
		
	} else if(av == "add") { // добавляет строки. В p1 - количество
		for(var i=0; i<p1; i++) {
			var f = this.find("tr:first").clone().appendTo(this).form("reset")
			if(opt.event.before_add.call(this, f) === false) return false
			f.find(".app-valid-img").remove()
			f.form(opt)
			if(opt.event.multi_add.call(this, f) === false) return false
		}
	} else if(av == "clean") {
		this.find("tr:gt(0)").remove()
		this.find("tr").form("reset")
	} else if(av == "erase") {	// удаляет строку с указанным индексом
		this.find("tr:eq("+p1+")").form("erase")
	} else {
		$.fn.form.apply( this.find("tr"), arguments );
	}
});

/*$.fn.multi = repeat(function(av, p1) {
	var self = this
	var opt = this[0].multi_opt
	var theme = app.conf.theme
	if(!opt) { // конструируем
		this.find("tr").append(
			$("<td>").append("<input type=hidden name=id value=0>").append(
				$("<img>").attr("src", theme +"img/erase.png").addClass("app-form-erase-btn")
			)
		)
		this.after($("<img>").attr("src", theme +"img/add.png").qtip("Добавить")
			.click(function() { self.multi("add", 1) }))
		av = av || {}
		opt = this.get(0).multi_opt = {
			event: {
				
				paste: $.noop,
				multi_add: $.noop,
				store: $.noop,
				store_success: $.noop,
				erase: $.noop,
				erase_success: function() { if(this.next().length || this.prev().length) this.remove(); return false },
			}
		}
	}
	if(typeof av == "object") {
		$.extend(true, opt, av)
		this.find("tr").form(opt)
		if (opt.hide_buttons){
			if (this.next().is("img")) this.next().remove()
			this.find(".app-form-erase-btn").remove()
		}
	} else if(av == "data") { // устанавливает данные. В p1 - массив. Если не хватает строк, то добавляет
		this.multi("clean")
		var k = p1.length - 1
		this.multi("add", k)
		this.find("tr").each(function(idx) { 
			if(opt.event.paste.call(this, p1[idx]) === false) return false
			$(this).form("data", p1[idx])
		})
		
	} else if(av == "add") { // добавляет строки. В p1 - количество
		for(var i=0; i<p1; i++) {
			var f = this.find("tr:first").clone().appendTo(this).form("reset")
			f.find(".app-valid-img").remove()
			f.form(opt)
			if(opt.event.multi_add.call(this, f) === false) return false
		} 
	} else if(av == "clean") {
		this.find("tr:gt(0)").remove()
		this.find("tr").form("reset")
	} else if(av == "erase") {	// удаляет строку с указанным индексом
		this.find("tr:eq("+p1+")").form("erase")
		if(opt.event.multi_erase.call(this, p1[idx]) === false) return false
	} else {
		$.fn.form.apply(this.find("tr"), arguments)
	}
})
*/





	/****************************** Справочник ******************************
	* $.fn.ref
	*
	*
	* Overused $.fn.listCreate
	* */

	(function () {
		var ref_op = [
			"=", "=", "<>", "≠", "<", ">", "<=", "⩽", ">=", "⩾", "like", "≈", "not like", "≉",
			"=*", "≡", "!*", "≢", "~", "~", "!~", "≁", "~*", "≃", "!~*", "≄",
			"is null", "∅", "is not null", "⊜"
		];


//  загружает и инициализирует справочник
function ref_init (opt) {
	var self = this,
		main = $("<div class='app-ref' style='overflow-x: auto; overflow-y:hidden; width:100%'></div>")
		.appendTo( this );

	var head = $("<table class=thead></table>")
		.appendTo(main);
	var scrollbody = $("<div style='height: 400px; overflow-x: hidden; overflow-y: auto;'></div>")
		.appendTo(main);
	var body = $("<table class=tbody></table>")
		.appendTo(scrollbody);
	var foot = $("<table class=tfoot></table>")
		.appendTo(main);

	// перемещаем по скроллу вертикальный скроллбар
	function scrollbody_resize() {
		scrollbody.width( main.scrollLeft() + main.width() +'px' );
	}
	main.scroll( scrollbody_resize )
		.resize( scrollbody_resize );

	// возвращаем выделенные строки
	function get_active_row() {
		return body.children("tbody").children(".app-active-row")
	}

	// форма для раскрытия элемента списка
	var form = $( "<form class='app-ref-form'></form>" )
		.attr( "id", "form-"+ opt.url )
		.appendTo( "body" )
		.dialog({
			modal: true,
			autoOpen: false,
			width: 500,
			title: opt.menu[ opt.menu.length-1 ]+' &#8680; запись',
			close: function() {
				//app.overlay.back();
			}
		});

	// открывает форму редактирования
	function edit() {
		var id = ( this.tagName == "TR" ? $(this): get_active_row() )
			.find("[name=id]").text();

		location.hash = self.attr("id") +"="+ id;
	}

	// вставка из справочника в поле ввода
	function insert() {
		var data = get_active_row().rowData();

		$("#"+opt.field).val( data[opt.from_field] )
			.change();
		$("#"+opt.field+"_id").val( data["id"] )
			.keyup().change();

		self.overlayDialog("close");
	}

	// открывает справочник для вставки
	function open_ref(dict, id, name) {
		var d1 = dict,
			id1 = id,
			n1 = name;

		return function() {
			location.hash = d1 +"=="+ id1 + (n1 ? "="+n1 : '');
		}
	}
	
	//  кнопки
	//
	var head_buttons = $("<div></div>")
		.prependTo( this )
		.append( $("<input type=submit value='Фильтр'>").click( function () {
			var filter = {};

			head.find("select").each( function() {
				var $ctx = $( this ),
					val = $.trim( $ctx.next().val() );

				if (this.value == "is null" || this.value == "is not null") {
					filter[this.name] = [this.value, ''];
				} else if (val) {
					filter[ $ctx.prop("filter_col") || this.name] = [this.value, val];
				}
			});

			/*body.listCreate({
					param: {
						filter: $.toJSON( filter )
					}
				})
				.list("clean")
				.list("load");*/
		body.listOldBundle({
				param: {
					filter: $.toJSON( filter )
				}
			})
			.listOldBundle("clean")
			.listOldBundle("load");

			head_buttons.children(":not(:nth(0),:nth(2))")
				.attr("disabled", "disabled")	// отключаем кнопки
		}))
		.append($("<input type=button value='Вставить' disabled>").click(insert))
		.append($("<input type=button value='Добавить'>").click(function() { form.form("reset").form("new") }))
		.append($("<input type=button value='Редактировать' disabled>").click(edit))
		.append($("<input type=button value='Удалить' disabled>").click(function() {
			dialogError("Вы действительно хотите удалить строку?", "Удаление строки справочника", 1, {
				"Удалить": function() {
					var row = get_active_row()
					var id = row.attr("list_id")
					$.post("/api/"+opt.url+"/erase", {id: id}, function() {
						row.remove()
					})
					$(this).dialog("close")
				}
			})
		}))

	// строка-шаблон для элемента списка
	var row = $("<tr></tr>").appendTo($("<table></table>").appendTo("body")).dblclick(edit).click(function() {
		get_active_row().removeClass("app-active-row")
		$(this).addClass("app-active-row")
		head_buttons.find((opt.field? "": ":not(:nth(1))")+":disabled").removeAttr("disabled")	// включаем кнопки
	});
	
	var trhead = $("<tr></tr>").appendTo(head) // формируем заголовок
	var trfilter = $("<tr></tr>").appendTo(head)
	var foot_group = 0
	
	var domain = opt.domain
	for(var i=0; i<domain.length; i++) {
		var dom = domain[i]
		var td = $("<td nowrap></td>").appendTo(trhead)
		var div = $("<td nowrap></td>").appendTo(trfilter)
		var dict = dom.dict || "ref_"+dom.ref
		
		var id = 'ref-filter-'+opt.model+'-'+dom.name
		$("<label></label>").text(dom.title).attr("for", id).appendTo(td)

		var op = $("<select></select>").attr("name", dom.name).appendTo(div)
		for(var j=0; j<ref_op.length; j+=2) $("<option></option>").attr("value", ref_op[j]).text(ref_op[j+1]).appendTo(op)

		var inp = $("<input />").attr("id", id).attr("name", dom.name).appendTo(div)
		if(dom.width) inp.width(dom.width)
		if(dom.ref) {
			op.prop("filter_col", dom.col? dom.col: "t_"+dom.name+".name")
			$("<input type=button value='…'>").appendTo(div).click(open_ref(dict, id, dom.from_field))
			//$("<input type=hidden />").attr("id", id+"_id").attr("name", dom.name+"_id").appendTo(div)
		}


		// ***** формируем шаблон для элементов списка *****
		var td = $("<td></td>").appendTo(row).append($("<div></div>").attr("name", dom.name))
			.mouseenter(function() {
				$(this).qtip({content: this.innerHTML }).qtip("show")
			})
			.mouseleave(function() {
				$(this).qtip("destroy")
			})
		if(dom.ref) td.append("<div style='display:none' name="+dom.name+"_id></div>")
		if(dom.group) foot_group = 1


		// ***** формируем форму *****
		id = 'ref-form-'+opt.model+'-'+dom.name
		var cls = dom["class"]? dom["class"]: "v-str0"
		$("<label></label>").text(dom.title).attr("for", id).appendTo(form)
		var inp = $("<input />").attr("id", id).attr("name", dom.name)

		if (dom.ref) {
			inp.appendTo(form).attr("readonly", "readonly").change(function(e) { form.form("sync", this.name) })
			$("<input type=button value='…'>").appendTo(form).click(open_ref(dict, id, dom.from_field))
			$("<input type=hidden />").attr("id", id+"_id").attr("name", dom.name+"_id").appendTo(form).addClass("v-id")
		} else inp.appendTo(form).addClass(cls)

		if (dom.name == "id") inp.attr("readonly", "readonly")

		form.append("<br>")
	}
	
	// добавляем к форме
	form.form({
		url: "/api/"+ opt.url,
		event: {
			load: function (options, id) {
				//options.minor = body.listGetItemById( id );
				options.minor = body.listOldBundle( 'id', id );
			},
			load_success: function (options, data) {
				this.dialog("open");
			},
			store_success: function (options, data, evt) {
				if (evt == "new") {
					location.hash = self.attr("id") +"="+ data.id;
				}
			}
		}
	});

	//  создаём список
	$.extend( opt.list_opt, {
		url: "/api/"+ opt.url +"/list/load",
		elem: row,
		scroll: scrollbody,
		pasted: function (div, row) {
			var th = head.find("tr:first td");

			div.children().each( function (idx) {
				$(this).children()
					.width( $(th[idx]).width()+1 );
			});
		},
		loaded: function (data) {
			var item;

			if ( foot_group ) {
				item = data.pop();
				foot.children("tbody")
					.children().remove();

				row.clone().appendTo( foot );

				if (item) {
					row.setFormData( item );
				} else {//  useless
					row.getFormData( item );
				}
			}
		}
	});
	
	//body.listCreate( opt.list_opt );
	body.listOldBundle( opt.list_opt );
}

//  справочник
//
$.fn.ref = repeat( function(av, p1) {
	var self = this,
		opt = this[0].ref_opt,
		opt1 = opt;

	if (!av) {
		av = {};
	}
	
	if ( !opt ) {
		opt = this[0].ref_opt = {
			field: null,//  id инпута в который вставлять
			list_opt: {
				param: {
					offset: 0,
					limit: 25,
					order: av.model +'.id desc',
					filter: "{}"
				}
			}
		}
	}
	
	if (typeof av == "object") {//copy-paste from $fn.list?
		$.extend(true, opt, av);

		var $node = this.find(".tbody");
		if ( $node.length ) {
			//$node.listCreate( opt.list_opt );
			$node.listOldBundle( opt.list_opt );
		}
	}

	//  конструируем
	if (!opt1) {
		var key = opt.url;

		//  инициализируем!!!!!!!!!!!!!!!!!
		ref_init.call( self, opt );

		app.event.add("logout", key, function() {
			//app.menu.rm(opt.menu)
			self.remove();
			app.event.rm("logout", key)
		});
			//this.dialog("option", "width", info.width || "700px")
			//this.dialog("option", "height", info.height || "500px")

		//  делаем оверлеем
		self.overlay({
			title: opt.menu[ opt.menu.length-1 ],
			resizable: true,
			draggable: true,
			open: function (id, field, from_field) {

				if(field) {
					opt.field = field;
					opt.from_field = from_field || "name"
				}
			
				if(id) setTimeout(function() {
					if(id == 0) $("#form-"+opt.url).form("reset").dialog("open")
					else if(id) $("#form-"+opt.url).form("load", id)
				}, 0);
			
				if(self.find(".tbody col:first").length == 0) {
					// срабатывает после отображения окна
					setTimeout( function () {
						var thead = self.find( ".thead" );
						var body = self.find( ".tbody" );
						var foot = self.find( ".tfoot" );
						var width;

						// проставляем ширину столбцов
						thead.find( "tr:first td" ).each( function () {
							var w = $( this ).width();

							$( "<col></col>" ).attr( "width", w + 'px' )
								.appendTo( body )
								.clone().appendTo( foot );
							//width += w
						} );

						width = thead.width() + "px";

						//body.list( "enable" )
						body.listOldBundle( "enable" )
							.width( width );

						foot.width( width );
					}, 10 );
				}
			},
			close: function() {
				if (data.url){
					app.event.rm("logout", data.url);
					$(this).remove();
				}
			}
		});

		return;
	}
});

		/**
		 * end of ref
		 */
	}());

	/**
	 * end of form
	 */
}());


/****************************** DEVELOPMENT SIMPLE LOADER ***********************************
 *
 *  С его помощью подгружаемые скрипты будут видны при отладке
 *  - удобно в р,работке и легч или ослаблятье строить за в кодевисимости
 *  - также задел на будущее под эффективную систему __сборки__
 *  на фронтенде в различных окружениях как под отладку, так и продакшен:
 *	  обфускация кода и минификация
 *	  склейка нескольких файлов с целью сокращения числа запросов
 *	  частичное разворачивание, когда, допустим, нужно отладить один исходный, а остальные
 *		  оставлять в собранном, минифицированном виде
 *
 *  todo попробовать amd, например, require.js или повозможности из смотреть m-tools *
 *
 *  @author: http://stackoverflow.com/users/83727/james-messinger
 *  @url: http://stackoverflow.com/questions/690781/debugging-scripts-added-via-jquery-getscript-function
 *
 *  Replace the normal jQuery getScript function with one that supports
 *  debugging and which references the script files as external resources
 *  rather than inline.
 *
 * */
jQuery.extend({
	getScript:function (url, callback) {
		var head = document.getElementsByTagName("head")[0];
		var script = document.createElement("script");
		script.src = url;

		// Handle Script loading
		{
			var done = false;

			// Attach handlers for all browsers
			script.onload = script.onreadystatechange = function () {
				if (!done && (!this.readyState ||
					this.readyState == "loaded" || this.readyState == "complete")) {
					done = true;
					if (callback)
						callback();

					// Handle memory leak in IE
					script.onload = script.onreadystatechange = null;
				}
			};
		}
		head.appendChild(script);

		// We handle everything using the script element injection
		return undefined;
	}
});


