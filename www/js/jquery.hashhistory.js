/**
 * jQuery hash change event
 *  refactored and patched on memory leaks
 *
 * Генерирует событие 'hashChange' (в контексте document)
 * и обеспечивает историю посещений для всех браузеров на любое изменение location.hash.
 *
 * Пример использования: $(document).bind('hashChange', function(e, newHash){ ... });
 * Изменять location.hash можно любым способом, включая обычные ссылки (<a href="#bla">bla</a>).
 *
 * Copyright (c) 2009 Sergey Berezhnoy <veged mail ru>
 */
(function($){
	var hash_history = {
		$document: $( document ),
		iframe: null,
		hash: '', // инициализируем пустым, чтобы учесть первоначальный хеш
			// считаем, что только IE нужно насильно записывать хистори (остальные сами справляются)
			ie_force_history: /MSIE/.test( navigator.userAgent ),
			after_read: false,
			after_add: false,

		// функция проверки изменения хеша, она же записывает хистори и вещает основное событие
		check: function () {
		var new_hash = document.location.hash;

		if ( this.hash != new_hash ) {
			this.hash = new_hash;

			// если мы только что прочли из хистори, не надо туда записывать
			if ( this.ie_force_history && !this.after_read ) {
				this.historyAdd( this.hash );
			}
			this.after_read = false;

			console.log( 'hashChange:\n' + this.hash );
			this.$document.trigger( 'hashChange', [this.hash] );
		}
		setTimeout( $.proxy( this.check, this), 42 ); // варварство из-за отсутствия полноценного события
	},
	// функция насильной записи в хистори через скрытый iframe
	historyAdd: function (hash) {
		if (!this.iframe ) {
			this.iframe = $('<iframe style="display:none" src="javascript:false;"></iframe>')
				.appendTo('body')[0];
		}

		var d = this.iframe.contentDocument ||
			(this.iframe.contentWindow ? this.iframe.contentWindow.document : this.iframe.document);

		// можем позволить себе вольности с незакрытыми тегами, браузер достроит
		d.open();
		// NOTE: потенциальная опасность с ескейпингом document.title
		d.write( '<html><head><title>' + document.title + '</title></head><body>' );
		// типа ради ескейпинга
		d.write( $('<div/>')
			.append( $('<div id="hashdiv"></div>').text( hash )).html() );
		// приписываем в тело фрейма скрипт, который будет срабатывать при возвращении на него по хистори
		d.write(
			'<script>' +
				// портим объект window для связи между фреймами
				'window._hash = document.getElementById("hashdiv").innerText;' +
				'window.onload = parent._historyRead;' +
				'</script>'
		);
		d.close();

		this.after_add = true;
	},
	fastenIE: function () {
		var self = this;

		document.attachEvent( 'onpropertychange', function () {
			if ( event.propertyName == 'location' ) {
				self.check();

				console.log( 'onpropertychange: ' + document.location.hash);
			}
		});
	},
	//  портим объект window, чтобы работало восстановление хистори через iframe
	stainWindow: function () {
		var self = this;

		window._historyRead = function () {
			// если мы только что добавили, читать не надо
			if (!self.after_add ) {
				var newHash = this._hash;
				console.log('newHash: ' + newHash + ', currentHash: ' + document.location.hash);

				// без надобности не присваиваем, как минимум из-за звука "клака" в IE
				if ( document.location.hash != newHash ) {
					self.after_read = true;
					document.location.hash = newHash;
					//console.log('historyRead: ' + newHash);
				}
			}

			self.after_add = false;
		};
	},

	start: function () {
		// для IE немного ускоряем обработку изменения хеша,
		// но поидее можно обойтись постоянно повторяющимся check()
		if ( 'onpropertychange' in document && 'attachEvent' in document ) {
			this.fastenIE();
		}

		if ( this.ie_force_history ) {
			this.stainWindow();
		}
	}
	};


	hash_history.start();
	// запускаем постоянную проверку с задержкой, чтобы все успели начать слушать события
	$(function(){
		setTimeout( $.proxy( hash_history.check, hash_history), 10 );
	});


})(jQuery);