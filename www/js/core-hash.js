/**
 *   Расширение js/core.js
 *   
 */


/************************************************** Следит за изменеием url после # **************************************************/
app.hash = new (app.util.Class("Hash", {
	init: function () {		// запускает таймер на каждые пол секунды
		this.construct = {index: $.noop}				// конструкторы функций. Запускаются, когда появляется элемент хеша (элементы ограничиваются /)
		this.reset = {}					// обработчики изменения состояний. Запускаются, когда изменяются именованные или обычные параметры элемента
		this.destruct = {}				// деструкторы функций. Запускаются, когда элемент удаляется из хеша
		this.hash = []					// старый хеш
		this.pause = 100				// пауза между проверками изменения хеша
	},
	start: function() {					// запускает опрос хеша
		app.hash.run()
		this.timer = setInterval(function() { app.hash.run() }, this.pause)
	},
	stop: function() {					// останавливает опрос хеша
		clearInterval(this.timer)
	},
	run: function() {		// обрабатывает измение хеша, если он не изменился - ничего не делает
		var new_hash = this.split()
		var old_hash = this.hash
		var n = new_hash.length<old_hash.length? new_hash.length: old_hash.length	// берём минимальную длинну
		for(var i=0; i<n; i++) {		// сравниваем пока одинаковы
			var nh = new_hash[i]
			var oh = old_hash[i]
			if(this.eq(nh, oh)) continue;
			if(nh[0] != oh[0]) break;
			var reset = this.reset[oh[0]]			// запускаем обработчик изменения элемента хеша
			if(reset) reset.apply(this, nh.concat(oh))
		}
		//if(i==old_hash.length) return;	// совпадают
		//console.log("i="+i+" new_hash.length="+new_hash.length+" old_hash.length="+old_hash.length)
		this.closeFrom(i)				// закрываем несовпадающие old_hash
		this.hash = this.applyFrom(i, new_hash)		// применяем совпадающие
		//console.log("old_hash="+app.exports.repr(old_hash)+" new_hash="+app.exports.repr(new_hash)+" hash="+app.exports.repr(this.hash))
		this.set()
	},
	closeFrom: function(i) {			// применяет деструкторы
		var hash = this.hash
		for(; i<hash.length; i++) {
			var id = hash[i][0]
			var des = this.destruct[id]
			if(des) des.apply(this, hash[i])
		}
	},
	applyFrom: function(i, hash) {		// применяет конструкторы. Удаляет незарегистрированные
		for(; i<hash.length; i++) {
			var args = hash[i]
			var id = args[0]
			var cons = this.construct[id]
			if(cons) cons.apply(this, args)
			else hash.splice(i, 1)
		}
		return hash
	},
	split: function() {		// разбивает хеш на составляющие. page=10!a=2!b=3=4/realty=20 вернёт [[page, [10], {a:2, b:[3, 4]}], [realty, [20], {}]]
		if(!location.hash) return []
		var hash = location.hash.slice(1).split('/')	// page=10!a=2!b=3=4/realty=20
		var ret = []
		for(var i=0; i<hash.length; i++) {
			var h = hash[i].split("!")		// page=10!a=2!b=3=4
			var arg = h[0].split("=")		// page=10
			var kw = {}
			for(var j=1; j<h.length; j++) {	// a=2!b=3=4
				var k = h.split("=")						// a=2
				kw[k[0]] = k.length==2?	k[1]: k.slice(1)	// {a:2, b:[3, 4]}
			}
			ret.push([arg[0], arg.slice(1), kw])			// [[page, [10], {a:2, b:[3, 4]}], [realty, [20], {}]]
		}
		return ret
	},
	eq: function(a, b) {	// сравнивает два одномерных массива
		if(!b) return false
		if(a[0]!=b[0]) return false
		var x = a[1], y = b[1]
		if(x.length!=y.length) return false
		for(var i=0, n=x.length; i<n; i++) if(x[i]!=y[i]) return false;	// сравниваем [..., [x], ...]
		a = a[2]	// сравниваем [..., {a}] и [..., {b}]
		b = b[2]
		for(i in a) if(a[i]!=b[i]) return false
		for(i in b) if(!(i in a)) return false
		return true
	},
	add: function(name, fn) {		// добавляет обработчик
		this.construct[name] = fn
	},
	add_reset: function(name, fn) {		// добавляет обработчик изменения состояния
		this.reset[name] = fn
	},
	add_close: function(name, fn) {		// добавляет деструктор
		this.destruct[name] = fn
	},
	set: function() {	// устанавливает хеш
		var ret = []
		var hash = this.hash
		for(var i=0; i<hash.length; i++) {	// [[page, [10], {a:2, b:[3, 4]}], [realty, [20], {}]]
			var h = hash[i]					// [[page, [10], {a:2, b:[3, 4]}]
			
			var kw = h[2]					// {a:2, b:[3, 4]}
			var w = []
			for(var j in kw) {
				var v = kw[j]
				w.push([].concat(j, v).join("="))
			}
			ret.push([[].concat(h[0], h[1]).join("=")].concat(w).join("!"))
		}
		ret = ret.join("/")
		if(ret == location.hash) return;
		if(ret) location.hash = ret
		else this.clear()
	},
	pop: function() {	// удаляет с вершины стека элемент. a=2/b=3/x=4 => a=2/b=3
		this.hash.pop()
		this.set()
	},
	push: function(a) {	// кладёт элемент на вершину стека
		this.hash.push(a)
		this.set()
	},
	top: function() {	// возвращает последний элемент хеша
		return this.hash[this.hash.length-1]
	},
	clear: function () {	// убирает # из location.hash
		if ( history.replaceState ) history.pushState( null, document.title, location.pathname+location.search )
		else location.hash = '#'
	}
}))()

/****************** оверлей ******************/
$.fn.overlay = repeat( function (options) {
	if ( !options ) options = {};

	if ( typeof options == 'object' ) {
		options = $.extend( {
			modal:true,
			autoOpen:false,
			resizable:false,
			draggable:true,
			width:"auto"
		}, options );

		//  attach CLOSE
		var func = options.close;
		options.close = function close_fn(event, ui) {
			app.hash.pop()
			if ( close_fn.close ) close_fn.close.call( this, event, ui )
		};
		options.close.close = func;
		
		var name = this.attr( "id" )
		var self = this
		app.hash.add_close(name, function() {		// если вдруг закроется  
			var original_close = self.dialog("option", "close")
			if(original_close.close) original_close.close.call(self)
			self.dialog("option", "close", $.noop)
			self.dialog("close")
			self.dialog("option", "close", original_close)
		})

		//  attach OPEN
		var func = options.open;
		delete options.open;
		// регистрируем в оверлее
		(function (that, name, open_func) {
			app.hash.add( name, function () {
				if ( open_func ) {
					if ( open_func.apply( this, arguments ) !== false ) that.dialog( "open" );
				}
				else that.dialog( "open" );
			});
		}(this, name, func));
	}

	return this.dialog( options );
} );

$.fn.overlayDialog = repeat( function (action_name) {
	if ( action_name == "open" && this.selector == "#settings_window" ) {
		//return this.resizable("widget");
	} else {
		return this.dialog( action_name );
	}
} );