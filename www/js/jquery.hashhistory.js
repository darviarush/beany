/**
 * jQuery hash change event
 *  refactored and patched on memory leaks
 *
 * ���������� ������� 'hashChange' (� ��������� document)
 * � ������������ ������� ��������� ��� ���� ��������� �� ����� ��������� location.hash.
 *
 * ������ �������������: $(document).bind('hashChange', function(e, newHash){ ... });
 * �������� location.hash ����� ����� ��������, ������� ������� ������ (<a href="#bla">bla</a>).
 *
 * Copyright (c) 2009 Sergey Berezhnoy <veged mail ru>
 */
(function($){
	var hash_history = {
		$document: $( document ),
		iframe: null,
		hash: '', // �������������� ������, ����� ������ �������������� ���
			// �������, ��� ������ IE ����� �������� ���������� ������� (��������� ���� �����������)
			ie_force_history: /MSIE/.test( navigator.userAgent ),
			after_read: false,
			after_add: false,

		// ������� �������� ��������� ����, ��� �� ���������� ������� � ������ �������� �������
		check: function () {
		var new_hash = document.location.hash;

		if ( this.hash != new_hash ) {
			this.hash = new_hash;

			// ���� �� ������ ��� ������ �� �������, �� ���� ���� ����������
			if ( this.ie_force_history && !this.after_read ) {
				this.historyAdd( this.hash );
			}
			this.after_read = false;

			console.log( 'hashChange:\n' + this.hash );
			this.$document.trigger( 'hashChange', [this.hash] );
		}
		setTimeout( $.proxy( this.check, this), 42 ); // ���������� ��-�� ���������� ������������ �������
	},
	// ������� ��������� ������ � ������� ����� ������� iframe
	historyAdd: function (hash) {
		if (!this.iframe ) {
			this.iframe = $('<iframe style="display:none" src="javascript:false;"></iframe>')
				.appendTo('body')[0];
		}

		var d = this.iframe.contentDocument ||
			(this.iframe.contentWindow ? this.iframe.contentWindow.document : this.iframe.document);

		// ����� ��������� ���� ��������� � ����������� ������, ������� ��������
		d.open();
		// NOTE: ������������� ��������� � ����������� document.title
		d.write( '<html><head><title>' + document.title + '</title></head><body>' );
		// ���� ���� ����������
		d.write( $('<div/>')
			.append( $('<div id="hashdiv"></div>').text( hash )).html() );
		// ����������� � ���� ������ ������, ������� ����� ����������� ��� ����������� �� ���� �� �������
		d.write(
			'<script>' +
				// ������ ������ window ��� ����� ����� ��������
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
	//  ������ ������ window, ����� �������� �������������� ������� ����� iframe
	stainWindow: function () {
		var self = this;

		window._historyRead = function () {
			// ���� �� ������ ��� ��������, ������ �� ����
			if (!self.after_add ) {
				var newHash = this._hash;
				console.log('newHash: ' + newHash + ', currentHash: ' + document.location.hash);

				// ��� ���������� �� �����������, ��� ������� ��-�� ����� "�����" � IE
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
		// ��� IE ������� �������� ��������� ��������� ����,
		// �� ������ ����� �������� ��������� ������������� check()
		if ( 'onpropertychange' in document && 'attachEvent' in document ) {
			this.fastenIE();
		}

		if ( this.ie_force_history ) {
			this.stainWindow();
		}
	}
	};


	hash_history.start();
	// ��������� ���������� �������� � ���������, ����� ��� ������ ������ ������� �������
	$(function(){
		setTimeout( $.proxy( hash_history.check, hash_history), 10 );
	});


})(jQuery);