(function() {
// упрощённый вариант функции jQuery.extend
function extend(a, b) { for(var i in b) a[i] = b[i] }
// выполняет eval от window
function globalEval(data) { ( window.execScript || function( data ) { window[ "eval" ].call(window, data) } )(data) }
function noop() {}

// загрузчик библиотеки js
var LibLoader = function(url, depend, lib) {
	extend(this, { url: url, ready: false, depend: depend, handler: [], lib: lib })
	lib.lib[url] = this
	
	console.log("load "+url+" depend="+depend.join(","))
	
	for(var i=0; i<depend.length; i++) {
		var dep = depend[i]
		if(!lib.lib[dep]) lib.include(dep)
	}
	
	var ldr = this
	this.get(url, function(q) {
		console.log("success " + ldr.url+" depend "+depend.join(",")+" ready="+lib.ready(depend))
		ldr.body = q.responseText
		lib.queue[url] = ldr
		ldr.queue()				// запускаем обработчики
	}, function(q) {
		console.log("error " + ldr.url)
		ldr.error = true
	})
}

extend(LibLoader.prototype, {
	getXMLHttp: function() {  // вернуть http-запрос
		if(window.XMLHttpRequest) try { return new XMLHttpRequest() } catch(e){}
		if(window.ActiveXObject) {
			var version = ["Microsoft.XMLHTTP", "MSXML2.XMLHttp.5.0", "MSXML2.XMLHttp.4.0", "MSXML2.XMLHttp.3.0", "MSXML2.XMLHttp", "Microsoft.XMLHttp"]
			for (var i = 0; i < version.length; i++) try { return new ActiveXObject(version[i]) } catch (e) {}
		}
		throw "Этот браузер не поддерживает технологию ajax"
	},
	get: function(url, fn, errfn) {	// вернуть файл
		var self = this
		var q = this.getXMLHttp()
		q.open('GET', url, true) // отправляем асинхронный запрос
		q.onreadystatechange = function() {	// для ie проставляем после open
			if(q.readyState != 4) return; // файл ещё не загрузился
			if(q.status == 200 || q.status==304) self.cache(url, q, fn) // q.statusText=='' - для протоколов file или ftp
			else errfn(q)
		}
		q.send(null)	// без post-данных
	},
	cache: function(url, q, fn) { // заставляет браузер использовать кеширование
		//console.log("response="+q.responseText.length+" status="+q.status+" heqad="+q.getAllResponseHeaders()+'url='+url+' date='+q.getResponseHeader("Date")+" this="+this)
		if(q.getResponseHeader("Date")) return fn(q)
		var cached = q
		q = this.getXmlHttp()
		var ifModifiedSince = cached.getResponseHeader("Last-Modified");
		ifModifiedSince = ifModifiedSince || new Date(0) // January 1, 1970
		q.open("GET", url, true)
		q.setRequestHeader("If-Modified-Since", ifModifiedSince)
		q.send(null)
		q.onreadystatechange = function() {	// для ie проставляем после open
			if(q.readyState != 4) return; // файл не загрузился
			if(q.status == 304) fn(cached)
			if(q.status == 200 || q.statusText=='') fn(q) // q.statusText=='' - для протоколов file или ftp
			else errfn(q)
		}
	},
	run: function() {	// вызывается, при загрузке очередной библиотеки
		console.log("run "+this.url+" = "+this.lib.ready(this.depend)+" depend=" + this.depend.join(", "))
		if(!this.lib.ready(this.depend)) return;
		delete this.lib.queue[this.url]	// отключаем ожидание загрузки
		this.load()
	},
	load: function() {	// инициализирует библиотеку
		console.log("load "+this.url)
		//globalEval(this.body)
		this.ready = true
		var handler = this.handler	// срабатывают ожидающие обработчики
		for(var i=0; i<handler.length; i++) handler[i].call(this, this.body)
	},
	queue: function() {	// запускает все обработчики
		var queue = this.lib.queue
		for(var i in queue) queue[i].run()
	},
	addHandler: function(handler) {
		this.handler.push(handler)
	}
})

// менеджер библиотек
var Lib = function() {
    console.log('Lib loader');

	this.lib = {}	// список библиотек {url: new LibLoader или элемент link или script}
	this.queue = {}	// очередь ожидающих зависимостей библиотек: {url: new LibLoader}
	this.theme = ""	// путь к css
};

extend(Lib.prototype, {
	require: function(url, depend, fn, typ) {
		if(!fn) fn = noop
		var ldr = this.lib[url]
		if(!ldr) {								// ещё не загружен
			ldr = new LibLoader(url, depend || [], this)
			if(typ) ldr.addHandler(typ)
		}
		if(!fn) return;
		if(ldr.ready) fn()						// уже загружен
		else ldr.addHandler(fn)					// грузится				
	},
	include: function(url, depend, fn) {
		if(depend instanceof Function) { fn = depend; depend = [] }
		var ext = url.slice(url.search(/\.\w+$/)+1)
		var typ
		if(ext == "js") typ = globalEval
		this.require(url, depend, fn, typ)
	},
	load: function(url, depend, fn) {
		if(depend instanceof Function) { fn = depend; depend = [] }
		this.require(url, depend, fn)
	},
	ready: function(files) {	// проверяет - загружены ли указанные файлы
		for(var i=0; i<files.length; i++) { var ldr = this.lib[files[i]]; if(!(ldr && ldr.ready)) return }
		return true
	},
	find: function(url) {		// возвращает библиотеку или undefined
		return this.lib[url]
	},
	js: function() {		// просто асинхронно подгружает js
		for(var i=0; i<arguments.length; i++) {
			var url = arguments[i]
			var script = document.createElement("script")
			extend(script, { type: "text/javascript", src: url })
			document.getElementsByTagName('head')[0].appendChild(script)
			this.lib[url] = script
		}
	},
	link: function() {		// подгружает css
		for(var i=0; i<arguments.length; i++) {
			var url = arguments[i]
			var link = document.createElement("link")
			extend(link, { type: "text/css", rel: "stylesheet", href: /^(\w+:|\/)/.test(url)? url: this.theme + url })
			document.getElementsByTagName('head')[0].appendChild(link)
			this.lib[url] = link
		}
	}
})

lib = new Lib()

})()