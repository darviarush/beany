/**
core - плагин для работы с аккаунтами пользователей
**/
(function () {

app.exports.loginPersonalProxy = {
	visible: false,
	$holder: $( '.hperson-container' ),
	loaded: false,
	$node: null,
	getNode: function () {
		if (!this.$node ) {
			this.$node = $( '#settings_btn' );
		}

		return this.$node;
	},
	setVisible: function (value) {
		this.visible = value;

		if ( this.loaded ) {
			app.exports.loginPersonalBlock.visible( value );
		}
	},
	init: function () {
		var self = this;

		this.getNode().one( 'click', function (e) {
			e.preventDefault();

			self.loadBlock();
		});
	},
	loadBlock: function () {
		var self = this,
			$node = this.getNode();

		app.page.include( '/api/html', {
			path: 'core/core_settings'
		}, function (rs_data, rs_type) {
			//  console.log( this );
			//  todo $.getScript()
			console.log( '@core_settings\n' );

			if ( app.exports.applyPersonal ) app.exports.applyPersonal();

			app.exports.loginPersonalBlock.init();
			$node.trigger( 'click' );

			self.loaded = true;

		}, this.$holder );
	}
};



var callback = {
	/*mv: function () {
		$( "#plugin-core" ).appendTo("#ht");
	},*/
	login: function () {
		$("#core-auth-href").hide();
		$("#auth_options").show();
	},
	logout: function () {
		$("#core-auth-href").show();
		$("#auth_options").hide();
	}
};



app.exports.applyCore = function () {
	//
	//  plugin init, register app.events and set start state
	//
	$( "#plugin-core" ).pluginInit();

	//app.event.add( "start-hide-end", "core-mv", callback.mv );
	app.event.add( "login", "core-login", callback.login );
	app.event.add( "logout", "core-logout", callback.logout );

	callback[ cookies().sess ? 'login' : 'logout' ]();

	var UserAuthEvent = {
		logout: {
			$link: $( "#logout" ),
			click: function (e) {
				e.preventDefault();

				$.post( "/api/core/logout", function () {
					app.auth.logout();

					app.exports.loginPersonalProxy.setVisible( false );
				});
			}
		},
		login: {
	        $form: $( "#login" ),
	        $input: $( "#core-login" ),
	        form_events: {
		        store_success: function (options, data) {
			        var cook_time = 365*20;
			        console.log( "data", data );

			        //если галочка установлена устанавливаем cookie
			        if ( $( "#auth-save-login" ).prop( 'checked' ) ) {
				        app.util
					        .set_cookie( "status", 1, cook_time );
				        app.util
					        .set_cookie( "login",  UserAuthEvent.login.$input.val(), cook_time );
			        } else {
				        app.util
					        .set_cookie( "status", null, 0 );
				        app.util
					        .set_cookie( "login",  null, 0 );
			        }

			        if ( data.code ) {
				        $("#change_password_dlg").dialog( "open" );
			        } else {
				        $("#auth_window").overlayDialog( "close" );
					}

					app.auth.login( data );

			        //  todo use realty impl
			        var isowner = $.inArray( "Арендодатель", data.name_role );
			        console.log( "isowner", isowner );
			        app.auth.isowner = (isowner >= 0);

			        return false;
		        }
	        }
        }
    };
	// Выйти
	UserAuthEvent.logout.$link.on( 'click', UserAuthEvent.logout.click );

	UserAuthEvent.login.$form.form({
		store: "/api/core/login",
		event: UserAuthEvent.login.form_events
	});
	//
	//  окно для логина/пароля
	//
	$( "#auth_window" ).overlay({
		open: function (name, av, kw) {
			// устанавливается значение login и auth-save-login из cookies
			var login = av[0], password = av[1]
			if ( cookies().status ) {
				$("#core-login").val( cookies().login )
				$("#auth-save-login").attr( "checked", "checked" )
			}
			if (!login ) return;

			UserAuthEvent.login.$form.setFormData({
				login: login,
				password: password
			}).submit();

			$("#auth").tabs( "select", 0 );
		},
		close: function () {
			var has_auth = cookies().sess;

			if ( has_auth ) {
				app.exports.loginPersonalProxy.setVisible( true );
				callback.login();

				$.post( "/api/login", function (data) {
					app.auth.login( data );
					//contact.set_data();
				});
			} else {
				//todo check
			}
		}
	});
};

}());