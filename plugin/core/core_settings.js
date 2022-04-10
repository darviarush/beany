/**
 *
 */
(function () {
	console.log( '@core::\n settings' );

	var contact = {
		del_img: function () {
			var count = 0,
				$contacts = $("#email-me,#phone-me").find( "input[ name=contact ]" );

			$contacts.each( function () {
				if ( this.value ) {
					count += 1;
				}
			});

			if ( count == 1 ) {
				$contacts.each( function () {
					if ( this.value ) {
						$(this).parent().parent()
							.find("img.app-form-erase-btn")
							.remove();//for e-mail and phone
					}
				});
			}
		},
		set_data: function() {
			var self = this,
				all = [ 'email','phone','skype' ];

			$.post( "/api/core/me/load", function (data) {
				var $node,
					prop;

				data = $.parseJSON( data );

				$("#core-me-info").form( "data", data.info );

				$.each( all, function (i, v) {
					prop = data[ v ];
					$node = $( "#"+ v +"-me" );

					$node.multi( "data", app.util.rowsToArrayOpt( prop ) );

					if (!prop.length) {
						var type = self.get_type( $( "tr:first", $node ) );

						$node.find("input[ name=type ]:first").val( type );
					}
				});

				self.del_img();
			});
		},
		get_type: function ($ctx) {
			var classes = $( "[ name=contact ]", $ctx )
				.attr( "class" );

			return classes.match( /v-\S+/g )[0].substr( 2 );
		}
	};


	app.exports.applyPersonal = function () {

		if ( cookies().sess ) {
			contact.set_data();
		}

		$( "#phone-me,#skype-me,#email-me" ).multi({
			event: {
				before_add: function (tr) {
					if (!tr.find("img.app-form-erase-btn").length){
						var img = $("<img>")
							.attr("src", app.conf.theme +"img/erase.png")
							.addClass("app-form-erase-btn");

						tr.find("input[name=id]").after(img)
					}
				},
				multi_add: function (tr) {
					var type = contact.get_type( tr );

					tr.form( "reset" );

					tr.find( "[ name=id ]" )
						.val( 0 ).keyup();

					tr.find( "input[ name=type ]" )
						.val( type ).keyup();

					tr.validate();
				},
				store: function(data, ev){
					var self = this;

					$.post( '/api/core/me/contact/store', {
						id: this.find("input[ name=id ]").val(),
						contact: this.find("input[ name=contact ]").val(),
						type: this.find("input [name=type ]").val()
					}, function (data) {
						data = $.parseJSON( data );

						self.find("[name=id]")
							.val( data.id );
					})
				},
				store_success: function(data, ev){
					//var self = this;
				},
				erase: function(data, ev){
					var self = this;

					$.post( '/api/core/me/contact/erase', {
						id: this.find("input[name=id]").val(),
						contact: '',
						type: this.find("input[name=type]").val()
					}, function () {
						if ( self.parent().find("input[name=type]").length > 1 ) {
							self.remove();
						}
					});
				},
				erase_success: function (data, ev) {
					var type = contact.get_type( this ),
						input_type = this.parent().find( "input[ name=type ]" );

					if ( input_type.length == 1 ) {
						input_type.val( type );
					}

					contact.del_img();
				}
			}
		});
		/*/  not overlay..
		 $("#settings_window").overlay({
		 // загружаем в форму данные при открытии окна
		 open: function () {
		 $( "#core-me" ).form( "load" );
		 }
		 });*/
		$( "#core-me-info" ).form({
			event: {
				store: function(options, data) {
					if ( data.phone ) {
						data.phone = data.phone.replace(/[\-\(\) ]+/g, '' );
					}
				}
			}
		});
		//$( "#core-me-info" ).form( "load" );


		//  создаем маску для логина
		//  todo refactor into methods
		//
		$( "#phone-me" ).on( 'keyup', function (event) {
			var $ctx = $( this );

			//  если пользователь нажал +
			if ( $ctx.val() == "+" && (!$ctx.prev().hasClass("app-over-phone")) ) {
				$ctx.prop( "app-selected-country", true );
				app.exports.phoneCountryMask.set( $ctx );

				$ctx[ 0 ].focus();
				return true;
			}

			//если пользователь нажал esc или backspace
			if ( (event.keyCode == 8 || event.keyCode == 27)
				&& $ctx.data( $.mask.dataName ) && $ctx.mask() == '' ) {// todo remove data

				// удаляем список и маску
				if ( $ctx.prev().find( "app-over-phone" ) ) {
					$ctx.prev().remove();

					$ctx.unmask().val('')
						.focus().blur();
					// сбрасываем маску и картинку
					$ctx.prop( "app-selected-country", false );
				}

				return true;
			}
		});

		// инициализируем диалог изменения пароля
		$( "#change_password_dlg" ).form({
			event: {
				// добавляем старый пароль к форме
				store: function (options, data) {
					data.old_password = $("#core-password").val();
				},
				store_success: function () {
					$("#change_password_dlg").dialog( "close" );
					$("#auth_window").overlayDialog( "close" );

					// чтобы не появлялось сообщение об успешном сохранении
					return false;
				}
			}
		});


		// для нового аккаунта
		$("#new_user_e-mail,#new_user_phone").form({
			store: "/api/core/new_user",
			msg: {
				store: {
					title: "Создание пользователя"
				}
			}
		});
		$("#recovery_password_e-mail,#recovery_password_phone").form({
			store: "/api/core/new_user",
			msg: {
				store: {
					title: "Восстановление пароля"
				}
			}
		});


		var set_opt_successor = {
			titles: {
				email: 'Письмо отправлено на {$token}',
				phone: 'смс отправлено на {$token}'
			},
			useContext: function (ctx_name, options) {
				var token = options.form.get(0).contact.value,
					name = this.titles[ ctx_name ].replace( '{$token}', token );

				dialogError( name, options.msg.store.title, 1 );

				return false;
			}
		};
		var set_opt = {
			mail: {
				event: {
					store_success: function(options) {
						return set_opt_successor.useContext( 'email', options );
					}
				}
			},
			phone: {
				event: {
					store_success: function(options) {
						return set_opt_successor.useContext( 'phone', options );
					}
				}
			}
		};
		// пользователь создаёт себе новый аккаунт
		$("#new_user_e-mail,#recovery_password_e-mail").form( set_opt.mail );
		$("#new_user_phone, #recovery_password_phone").form( set_opt.phone );

		$( "#change_password" ).form({
			"store": "/api/core/change_self_password",
			"msg": {
				"store": {
					"success": "Пароль успешно изменён",
					"title": "Изменение пароля"
				}
			}
		});

		// если нажат capslock или символы больше 127
		$( "#core-password" ).on( 'keypress', function (e) {
			var ch = String.fromCharCode( e.which ),
				$caps = $( "#core-check-capslock" ),
				inner = '';

			if ( ch.toUpperCase() === ch && ch.toLowerCase() !== ch && !e.shiftKey ) {
				inner += "<li>CapsLock включён - вводятся ЗАГЛАВНЫЕ буквы</li>";
			}
			if( e.which > 127 ) {
				inner += "<li>Вводятся русские буквы</li>";
			}

			if ( $caps[0].capsLockTip == inner ) {
				return;
			}
			$caps[0].capsLockTip = inner;

			if ( inner.length == 0 ) {
				$caps.qtip( "destroy" );
			} else {
				$caps.qtip({
					content: "<ul>"+ inner +"</ul>"
				}).qtip("show")
			}
		});
	};

}());



/**
 *
 */
app.exports.loginPersonalBlock = (function () {
	var block = {
		$wrap: $( '.hperson-container' ),
		$personal: null,
		base_css_class: 'hperson-container',
		hidden_css_class: 'hperson-default',
		$show_login: null,

		attachBlock: function () {
			this.$wrap
				.pluginInit();

			this.$personal = this.$wrap.children();
		},
		bindClickHandlers: function () {
			var self = this;

			self.$show_login.on( 'click', function (e) {
				self.onClickHandler();

				e.preventDefault();
			});
			self.$wrap.children().on( 'click', function (e) {
				e.stopPropagation();
			});
			self.$wrap.on( 'click', $.proxy( self.onClickHandler, self ) );

			//todo listen for app.events change
		},
		onClickHandler: function () {
			this.onActivate( this.isHidden() );
		},
		isHidden: function () {
			return this.$personal.hasClass( this.hidden_css_class ) || this.$wrap.hasClass( this.hidden_css_class );
		},
		onActivate: function (on) {
			this.$personal[ on ? 'removeClass' : 'addClass']( this.hidden_css_class );
		},
		setUp: function () {
			this.attachBlock();
			this.bindClickHandlers();

			this.onActivate();
			this.$wrap.show();
		}
	};

	return {
		init: function () {
			block.$show_login = $( '#settings_btn' );

			block.setUp();
		},
		visible: function (show) {// for after_load() call
			var $node = block.$show_login,
				is_visible;

			if ( $node && block.$wrap ) {
				is_visible = $node.parent().css( 'display' ) != 'none';

				if (!is_visible && !show ) {
					block.$wrap.addClass( block.hidden_css_class );
				} else {
					block.$wrap.removeClass( block.hidden_css_class );
				}
			}
		},
		getCurrentHeight: function () {
			return block.isHidden() ? 0 : block.$personal.outerHeight();
		}
	}

}());
