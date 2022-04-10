/**
armoring - плагин для 
**/

(function () {
	app.util.Class( "RealtyArmPeriod", {
		Extend: Array,	// наследует массив - зачем??? Потому, что это - массив. В него просто добавили методы, но так, чтобы не запортить основной
		
		init: function(a) {	// импортирует массив, если передан a
			if(a) for(var i=0; i<a.length; i++) this.push(a[i])
		},
		get_less: function(date) {	// возвращает период из выбора пользователя с этой или ближайшей меньшей датой
			date = date.date_only()
			for(var i=0; i<this.length && this[i].fromdate <= date; i++) {}
			this.idx = i-1
			return i==0? false: this[this.idx = i-1]
		},
		get_great: function(date) {	// возвращает период из выбора пользователя с этой или ближайшей большей датой
			date = date.date_only()
			for(var i=this.length-1; i>=0 && date <= this[i].todate; i--) {}
			this.idx = i+1
			return i==this.length-1? false: this[i+1]
		},
		select: function(date) {	// добавляет к выбору пользователя дату
			date = date.date_only()
			var less = this.get_less(date), idx_less = this.idx
			var great = this.get_great(date), idx_great = this.idx
			if(less && less === great) return false 					// уже есть в выборе
			if(date.add(-1).eq(less.todate)) less.todate = date 		// увеличиваем интервал предыдущей даты
			if(date.add(1).eq(great.fromdate)) great.fromdate = date	// захватываем интервалом следующей даты
			if(less && less.todate.eq(great.fromdate)) {							// объединяем
				this.splice(idx_great, 1)								// удаляем большую
				less.todate = great.todate								// подвигаем меньшую
				return true
			}
			if(date.eq(less.todate) || date.eq(great.fromdate)) return true
			this.splice(idx_less+1, 0, {fromdate: date, todate: date})
		},
		unselect: function(date) {	// удаляет из выбора пользователя дату
			date = date.date_only()
			var less = this.get_less(date)
			if(!less) return false			// дата не выбрана
			if(less.fromdate.eq(less.todate)) this.splice(this.idx, 1)		// удаляем
			else if(less.todate.eq(date)) less.todate = less.todate.add(-1)
			else if(less.fromdate.eq(date)) less.fromdate = less.fromdate.add(1)
			else {	// разбиваем на 2 части
				this.splice(this.idx+1, 0, {fromdate: date.add(1), todate: less.todate})
				less.todate = date.add(-1)
			}
			return true
		},
		begin: function(date) {					// проверяет - дата является ли началом какого-то из периодов
			var less = this.get_less(date)
			return less && less.fromdate.eq(date.date_only())
		},
		end: function(date) {
			var less = this.get_less(date)		// проверяет - дата является ли концом какого-то из периодов
			return less && less.todate.eq(date.date_only())
		}
	});

	/****************************************** бронирование ******************************************/
	//
	// класс для бронирования и предоствления информации о других бронях, оплатах и т.п. привязанных к квартире
	//
	// записывает в череду массивов значение. Если какого-то подмассива не существует, то он создаётся
	// set_elem({}, 1, 2, 3, "val") == {1: {2: {3: "val"}}}


	//  helper
	//
	var ArmoryPeriod = {
		setItem: function (obj) {
			var arg_len = arguments.length,
				val = arguments[ arg_len - 1 ],
				last_idx = arg_len - 2;

			for (var i = 1; i < last_idx; i++) {
				var idx = arguments[i]
				var elem = obj[idx];

				if ( !elem ) {
					obj[idx] = elem = {}
				}
				obj = elem
			}

			obj[ arguments[ last_idx ] ] = val;
		},
		// возвращает элемент или undefined, если его нет
		getItem: function (obj) {
			for (var i = 1, n = arguments.length; i < n; i++) {
				var idx = arguments[i]
				obj = obj[idx]
				if ( !obj ) return;
			}

			return obj
		},
		removeItem: function (obj) {
			var st = [];// кандидаты на удаление

			for (var i = 1, n = arguments.length; i < n; i++) {
				var idx = arguments[i]
				st.push( [obj, idx] )
				obj = obj[idx]
				if ( !obj ) return;
			}
			for (var k = st.length - 1; k >= 0; k--) { // удаляем только пустые подмассивы
				var stk = st[k]
				var obj = stk[0], idx = stk[1]
				delete obj[idx]
				if ( !$.isEmptyObject( obj ) ) return;
			}
		},
		//  facade
		getBooking: function (period, date) {
			// возвращает [arm, false] или [arm, arm]
			return this.getItem( period, date.getYear(), date.getMonth(), date.getDate() );
		},
		setBooking: function (period, date, a) {
			// устанавливает массив
			this.setItem( period, date.getYear(), date.getMonth(), date.getDate(), a );
		},
		removeBooking: function (period, date) {
			// удаляет массив
			this.removeItem( period, date.getYear(), date.getMonth(), date.getDate() );
		},
	};

	app.util.Class( "RealtyArmoring", {
		init: function(av) {	// конструктор. Получает массив заявок (armoring) из запроса
			var armoring = av.armoring
			// переводим в формат armperiod[год][месяц][день] = [бронь, накладвающаяся бронь]
			var armperiod = this.period = {}		// индексный массив по дням
			this.armoring = armoring	// все заявки
			this.realty_id = av.id
			this.dp_refresh = av.dp_refresh
			this.new_armor()		// создаём новый описатель пользовательского ввода без обновления календаря
			
			var self = this
			
			for(var i=0; i<armoring.length; i++) {
				var arm = armoring[i]
				var period = arm.ownArmperiod			// периоды заявки
				
				for(var j=0; j<period.length; j++) {	// идём по периодам и добавляем заявку в дни в которых она есть
					var period_ = period[j]
					var from = period_.fromdate = DatDate(period_.fromdate)
					var to = period_.todate = DatDate(period_.todate)

					from.to(to, function() {
						var a = self.get(this)
						a = a? [a[0], arm]: [arm, false]
						self.set(this, a)
					})
				}
				arm.ownArmperiod = new app.classes.RealtyArmPeriod(period)	// преобразуем
			}
		},
		save_sel: function(opt, norefresh) { // создаёт пустой armor
			this.armor.opt = opt
			this.armoring.push( this.armor );

			this.new_armor();
			if (!norefresh ) {
				createArmoring.dp_refresh();
			}
		},
		new_armor: function() {
			this.sel = new app.classes.RealtyArmPeriod();	// выбор пользователя

			this.armor = {
				realty_id: this.realty_id,
				user_id: app.auth.user_id,
				ownArmperiod: this.sel,
				opt: 0
			};
		},
		get: function (date) {
			return ArmoryPeriod.getBooking( this.period, date );
		},
		set: function (date, a) {
			ArmoryPeriod.setBooking( this.period, date, a );
		},
		del: function (date) {
			ArmoryPeriod.removeBooking( this.period, date );
		},
		remove: function(arm) {	// удаляет указанный arm из всех дат
			var self = this
			//console.log("self", self)
			$.each(arm.ownArmperiod, function() {
				//console.log("fromdate", this.fromdate)
				this.fromdate.to(this.todate, function() {
					var a = self.get(this)
					if(a[1] && a[1] === arm) a[1] = false
					if(a[0] && a[0] === arm) {
						if(!a[1]) { 
							self.del(this) 
						}
						else {
							a[0] = a[1]
							a[1] = false
						}
					}
				})
			})
			createArmoring.dp_refresh()
		},
		copy: function(arm, realty_armoring) {	// устанавливает выбор на основе arm в RealtyArmoring
			var self = this
			$.each(arm.ownArmperiod, function() {
				this.fromdate.to(this.todate, function() {
					realty_armoring.add(this)
				})
			})
		},
		add: function(date) { // добавляет день к выбору. Возвращает false, если выбрать нельзя
			var a = this.get(date)
			if(a && a[1]) return false
			if(a && a[0] === this.armor) return false
			if(a) {
				var period = a[0].ownArmperiod	// можно бронировать только дни на концах занятого периода
				var less = period.get_less(date)
				if(less && !(less.fromdate.eq(date) || less.todate.eq(date))) return false
				a[1] = this.armor
			} else a = [this.armor, false]
			this.set(date, a)
			this.sel.select(date)
			return true
		},
		rm: function(date) { // удаляет день из выбора. Возвращает false, если нельзя удалить
			var a = this.get(date)
			if(!a) return false
			if(a[0] === this.armor) this.del(date) 
			else if(a[1] === this.armor) a[1] = false
			else return false
			this.sel.unselect(date)
			return true
		},
		arm: function(date) { // бронирует или снимает бронь
			if(this.add(date)) return true
			return this.rm(date)
		},
		left_arm: function(date) {	// бронирует или снимает бронь от левой забронированной этим пользователем даты, до этой
			var less = this.sel.get_less(date)
			if(!less) return this.arm(date)
			var self = this, ret = false
			date = date.date_only(); // ; обязательна
			(less.todate < date? less.todate.add(1): less.fromdate).to(date, function() {
				if(self.arm(this)) ret = true
			})
			return ret
		},
		right_arm: function(date) {	// бронирует или снимает бронь от правой забронированной этим пользователем даты, до этой
			var great = this.sel.get_great(date)
			if(!great) return this.arm(date)
			var self = this, ret = false
			
			date = date.date_only()
			date.to((great.fromdate > date? great.fromdate.add(-1): great.todate), function() {
				if(self.arm(this)) ret = true
			})
			return ret
		},
		all_arm: function(date) {	// выбираем все
			var less = this.sel.get_less(date)
			var great = this.sel.get_great(date)
			if(!(less && great)) return false;
			var self = this
			less.fromdate.to(great.todate, function() {
				self.arm(this)
			})
			return true
		},
		short_left_arm: function(date) {	// бронирует или снимает бронь от ближайшей забронированной этим пользователем даты, до этой
			var less = this.sel.get_less(date)
			if(less && less.fromdate == less.todate) return this.left_arm(date)
			return this.arm(date)
		},
		clear: function() { // очищает все отмеченные пользователем даты
			var sel = this.sel
			var self = this
			for(var i=0; i<sel.length; i++) sel[i].fromdate.to(sel[i].todate, function() {
				var a = self.get(this)
				if(a[0] == self.armor) self.del(this)
				else a[1] = false
			})
			sel.splice(0, sel.length)
		},
		is_armored: function(date) {	// 1 - день забронирован, 0 - нет, -1 - забронирован, но бронирование возможно
			var a = this.get(date)
			if(!a) return 0
			if(a[1]) return 1
			return -1
		},
		// день куплен
		is_bayed: function(date) {
			var a = this.get( date );
			return a && (a[0].opt==1 || a[1].opt==1)
		},
		// день забронирован текущим пользователем. Возращает эту бронь или false
		is_me_armored: function(date) {
			var a = this.get( date );
			if(a && app.auth.user(a[0].user_id)) return a[0]
			if(a && app.auth.user(a[1].user_id)) return a[1]
			return false
		},
		is_me_bayed: function(date) { // день куплен текущим пользователем
			return this.is_me_armored(date).opt==1
		},
		get_class1: function(arm) {	// возвращает css-класс для datepicker-а
			if(arm == this.armor) return "app-dp-select"
			var postfix = arm.user_id == app.auth.user_id? "-self": ""
			if(arm.opt == 1) return "app-dp-bayed" + postfix
			if(arm.opt == 2) return "app-dp-blocked"
			if(arm.opt == 3) return "app-dp-cena"
			if(arm.opt == 4) return "app-dp-application"
			if(arm.opt == 5) return "app-dp-save-application"
			if(arm.opt == 6) return "app-dp-no-application"
			if(arm.opt == 7) return "app-dp-overdue-application"
			return "app-dp-armored" + postfix
		},
		get_BackgroudPosition: function (arm, pos) {
			var ItemWidth = 64,
				count = 30;

			//console.log( arm.opt );
			position = ItemWidth*( count/3 - arm.opt + pos );
			//console.log("background-position:\n", position );
		},
		get_class: function (date) {	// возвращает css-классы для datepicker-а
			var a = this.get( date );

			if (!a ) return '';

			var css = [],
				className = this.get_class1( a[0] ),
				begin = a[0].ownArmperiod.begin( date );

			if ( begin ) {
				this.get_BackgroudPosition(a[0], 1)
				css.push( className );
			} else if( a[0].ownArmperiod.end(date) ) {
				this.get_BackgroudPosition(a[0], 3);
				css.push( className+"2" );
			} else {
				this.get_BackgroudPosition(a[0], 1);
				this.get_BackgroudPosition(a[0], 3);
				css.push( className );
				css.push( className+"2" );
			}

			if ( a[1] ) {
				className = this.get_class1( a[1] );

				if (!begin) {
					css.push( className );
				} else {
					css.push( className+"2" );
				}
			}

			return css.join(" ");
		}
	});



	createArmoring = {
		$realty: $("#realty-card" ),
		$dp: $("#realty-dp"),
		armoring: null,
		armoring_cost: null,
		json: null,
		str: '',
		$list: $( "#realty-selarmoring-list" ),
		//savekeys: function (e) {		console.log("savekeys$dp", this.$dp) this.$dp[0].keys = {shift: e.shiftKey, meta: e.metaKey, alt: e.altKey, ctrl: e.ctrlKey}},
		q_opt: function (arm, s) {
			if(!arm || this.armoring.armor === arm) return;
			var end = '', img = ''
			if(app.auth.user(arm.user_id)) {
				end = " Вами"
				img = "<img src='"+app.conf.theme+"img/user.png' height=16 width=16>"
			}
			if(arm.opt==0) this.str += "<p>"+img+"<img src='"+app.conf.theme+"img/homearm.png' height=16 width=16> Забронировано"+end+"</p>"
			else if(arm.opt==1) this.str += "<p>"+img+"<img src='"+app.conf.theme+"img/homebay.png' height=16 width=16> Оплачено"+end+"</p>"
			else if(arm.opt==2) this.str += "<p><img src='"+app.conf.theme+"img/block.png' height=16 width=16> Заблокировано</p>"
			else if(arm.opt==3) this.str += "<p><img src='"+app.conf.theme+"img/money.png' height=16 width=16> <b>Цена:</b> "+arm.cena+"</p>"
			else if(arm.opt==4) this.str += "<p><img src='"+app.conf.theme+"img/money.png' height=16 width=16> <b>Отправлен запрос на бронировамние</b></p>"
			else if(arm.opt==5) this.str += "<p><img src='"+app.conf.theme+"img/money.png' height=16 width=16> <b>Заявка принята. Оплатите коммисию.</b></p>"
			else if(arm.opt==6) this.str += "<p><img src='"+app.conf.theme+"img/money.png' height=16 width=16> <b>Заявка отклонена арендодателем.</b></p>"
			else if(arm.opt==7) this.str += "<p><img src='"+app.conf.theme+"img/money.png' height=16 width=16> <b>Подтверждение на заявку просрочено</b></p>"
		},
		onsavekeys: function () {
			var self = this
			
			self.$dp.find( ".ui-datepicker-calendar a" ).click(function (e) {
				self.$dp[0].keys = {shift: e.shiftKey, meta: e.metaKey, alt: e.altKey, ctrl: e.ctrlKey}
			})
			
			self.$dp.find( ".ui-datepicker-calendar td" ).each(function() {
				self.str = '';

				var date = this.className.replace(/^.*\bi-(\d{4})-(\d{2})-(\d{2})\b.*$/, '$1/$2/$3')
				if(date == this.className) return;
				
				date = new Date(date)

				var a = self.armoring.get(date)
				if(a) { self.q_opt(a[0]); self.q_opt(a[1]) }
				
				a = self.armoring_cost.get(date)
				if(a) { self.q_opt(a[0]); self.q_opt(a[1]) }
				
				if(self.str) {
					$(this).qtip({content: self.str})
				}
			})
		},

		dp_refresh: function() {
			this.$dp.datepicker("refresh");
			this.onsavekeys(); 
			return this.$dp; 
		},

		show_tip: function(a, style) {
			$("#realty-q-money").qtip({content: a, position: {	my: 'bottom center', at: 'bottom center' }, style: {classes: "ui-tooltip-"+style},
				hide: {
					effect: function(offset) {
						var self = $(this).slideUp(2000, function() { self.qtip("destroy") })	// "this" refers to the tooltip
					}
				}}).qtip("show")
			setTimeout(function() { $("#realty-q-money").qtip("hide") }, 1300)
		},
		
		aftersavekeys: function() { 
			var self = this
			setTimeout(function(){self.onsavekeys()}, 0)
		},

//s:13b
		createList: function () {
			var self = this,
				sel = self.armoring.sel,
				add_options = ''

			$.each( this.armoring.sel, function () {
				var fromdate = $.datepicker.formatDate('dd.mm.yy', this.fromdate),
					todate =  $.datepicker.formatDate('dd.mm.yy', this.todate),
					val = fromdate +'-'+ todate,
					option = self.$list.find( 'option [value="'+ val +'"]' );

				if (!option.length ) {
					add_options += '<option value="'+val+'">' + fromdate +" "+$("#realty-selarmoring-fromtime").val() +"-"+ todate +" "+$("#realty-selarmoring-totime").val()+'</option>';
				}

				option.prop( "isSel", true );
			});

			this.$list
				.find( "option" ).each( function () {
				if (!$(this).prop("isSel") ) {
					$(this).remove();
				}
			});

			this.$list.append( $( add_options ) );
			this.$list.show();
		},
		/*setStyleItemDP: function(data, time, isFromdate){
			data = data.match(/(\d{2})\.(\d{2})\.(\d{4})/);
			var shift = 0;
			if (isFromdate)
				shift = 192;
			var Img_width = 1920;
			var times = time.match(/(\d{2}):(\d{2})/);
			var min = parseInt(times[1], 10)*60+parseInt(times[2], 10);
			var pos = parseInt(1138 * min/(12*60), 10);

			$(".i-"+data[3]+"-"+data[2]+"-"+data[1]).css("background-position", pos)
		},*/
//e:13b
		init: function (json) {
			var self = this,
				armorings = app.util.rowsToArrayOpt( json.armoring );

			var grep_any = $.grep( armorings, function (a) {
				return a.opt < 3 || (a.opt > 3 && a.user_id == app.auth.user_id);
			});//все остальное
			var grep_cost = $.grep( armorings, function (a) {
				return a.opt == 3;
			});// то что забронировано
			
		
			self.armoring = new app.classes.RealtyArmoring({
				id: json.id,
				armoring: grep_any,
				dp_refresh: self.dp_refresh
			});
			self.armoring_cost = new app.classes.RealtyArmoring({
				id: json.id,
				armoring: grep_cost,
				dp_refresh: self.dp_refresh
			});
			
			this.json = json
			
			self.$dp.datepicker("destroy").datepicker({
				numberOfMonths: 3,
				changeMonth: true,
				changeYear: true,
				onChangeMonthYear: function() { 
					self.aftersavekeys()
				},
				// выполняется для каждой даты при отрисовке календаря и выборе даты
				beforeShowDay: function(date) {
					var css = self.armoring.get_class(date)+' '+self.armoring_cost.get_class(date)
					if(css != ' ') css += ' i-'+DateDat(date)
					return [true, css]
				},
				// щёлкнули на дате календаря
				onSelect: function(dateText, input) {
					var user_id = app.auth.user_id
					if(!user_id) {
						dialogError("Вы должны зарегистрироваться, чтобы подать заявку на бронирование", "Заявка", 1)
						return
					}
					var keys = self.$dp[0].keys	// какие управляющие клавиши зажаты в момент клика?
					var date = new Date(input.selectedYear, input.selectedMonth, input.selectedDay)
					
					if(!keys) { //console.log("not keys on calendar"); 
						keys = {} 
					}
					if(keys.alt) self.armoring.all_arm(date)
					else if(keys.ctrl && keys.shift) self.armoring.right_arm(date)
					else if(keys.shift) self.armoring.left_arm(date)
					//else if(keys.ctrl) armoring.add_full(date)
					else self.armoring.short_left_arm(date)
					var period = []
					var idx = 0
					$("span [name=cena_month_cur]").text()
					$.each(self.armoring.sel, function() {
						var fromdate = this.fromdate
						var todate = this.todate
						var cena = self.armoring_cost.get(fromdate)?self.armoring_cost.get(fromdate)[0].cena:$("span[name=cena_cur]:first").text()
							period[idx] = {fromdate: new Date(fromdate), todate: new Date(todate), cena: cena}
						
						this.fromdate.to(this.todate, function() {
							var t_cena = self.armoring_cost.get(this)?self.armoring_cost.get(this)[0].cena:$("span[name=cena_cur]:first").text()
							if (t_cena != cena){
								idx++;
								period[idx] = {fromdate: new Date(this), todate: period[idx-1].todate, cena: t_cena}
								cena = t_cena;
								period[idx-1].todate = this.add(-1)
							}
						})
						idx++;
					})
					var balance = 0
					var str = ""
					for (var i = 0; i < period.length; ++i){
						balance = balance + period[i].cena*(1+(period[i].todate - period[i].fromdate)/86400000)
						str = str + period[i].cena + "x("+ $.datepicker.formatDate('dd.mm.yy', period[i].fromdate) +"-"+$.datepicker.formatDate('dd.mm.yy',period[i].todate)+")"
					}
					//Баланс и итого для карточки
					$("#realty-service-balance, #realty-total-arenda").text(balance)
					$("#realty-list-date").text(str)
				
					app.event.run("total")
					// выполнится сразу после перестройки календаря
					self.aftersavekeys()
					//self.createList()
				}
			});

			self.onsavekeys();
		},
		onChangeInfoUser: function () {
			var $ctx = $(this),
				param = {},
				path = '',
				value = $ctx.val(),
				id = $ctx.attr("id");
				
			if (id == "realty-armoring-fio") {
				param = {id: app.auth.user_id, name: value}
				path = "/api/core/me/store"
			} else {
				param = {id:0, contact: value, type: id.match(/[a-z]*$/)[0]}
				path = "/api/core/me/contact/store"
			}

			if ($ctx.valid()){
				$.ajax({
					url: path,
					type: 'post',
					data: param, 
					success: function(data) {
						$ctx.next().attr("src", app.conf.theme+"img/save_ok.png")
						$ctx.disabled = true
					},
					error: function(data){
						$ctx.val("")
						$ctx.next().attr("src", app.conf.theme+"img/bug.png")
					}
				})
			}
		},
		setHandler: function(){
			var self = this,
				$picker = $( "#realty-dp" );
			
			$("#r-d0").on( 'change', function () {
				$picker.datepicker( "option", "numberOfMonths", 3 )[0];

				self.dp_refresh();
			});
			$("#r-d1").on( 'change', function () {
				$picker.datepicker( "option", "numberOfMonths", 12 )[0];

				self.dp_refresh()
					.children().css("width", "auto");
			});

			
			$("#realty-dp-clear").on( 'click', function (e) {
				e.preventDefault();

				$("#realty-service-balance, #realty-total-arenda, #realty-list-date").text(""); 
				self.armoring.clear(); 
				self.dp_refresh(); 
				return false 
			});
			
			$("#realty-dp-block").on( 'click', function (e) {
				e.preventDefault();

				if ( self.armoring.sel.length ) {
					$.post( "/api/armoring/block", {
						ownArmperiod: $.toJSON( self.armoring.sel ),
						id: self.json.id
					}, function (data) {
						data = $.parseJSON( data )
						self.armoring.armor.id = data.id
						self.armoring.save_sel(2)
					});
				} else {
					self.show_tip("Выделите период")
				}
				return false
			});
			
			$("#realty-dp-noblock").on( 'click', function (e) {
				e.preventDefault();

				var date = self.$dp.datepicker( "getDate" )
				var a = self.armoring.get( date )
				var arm
				
				if ( a ) {
					$.each( a, function () {
						if ( this && this.opt==2 ) {
							arm = this;
							return false
						}
					});
				}
				
				if (arm) $.post("/api/armoring/erase", {id: arm.id}, function(data) {
					self.armoring.remove(arm)
				}); else self.show_tip("Выберите заблокированный период")
				return false
			})
			
			$("#realty-dp-money").on( 'click', function (e) {
				e.preventDefault();

				var cost = $("#realty-i-money")
				var cena = cost.val()
				if(!cost.valid()) { cost.qtip("show"); return false }
				
				$.map(self.armoring.sel, function(a) {
					$.datepicker.formatDate('dd.mm.yy', a.fromdate)
					$.datepicker.formatDate('dd.mm.yy', a.todate)
				})
				
				var fromdate, todate, fromdate_arm, todate_arm
				var priznak = 0
				
				var sel = self.armoring.sel
				var arm = self.armoring_cost.armoring
				
				X_label: for(var i = 0; i < sel.length; i++) {
					var a = sel[i]
					for(var j = 0; j < arm.length; j++) {
						for(var k = 0; k < arm.length; k++) {
							var arm_j = arm[j].ownArmperiod
							for(var n=0; n<arm_j.length; n++) {
								var b = arm_j[n]
								if (a.fromdate >= b.fromdate && a.fromdate <= b.todate || a.todate >= b.fromdate && a.todate <= b.todate) {
									priznak = 1
									break X_label
								}
							}
						}
					}
				}
			
				if (priznak == 1) { self.show_tip("Выделенный интервал захватывает интервал с уже установленной ценой. Цену можно только изменить"); return false}
				
				if(!self.armoring.sel.length) { self.show_tip("Выделите период"); return false }
				
				$.post("/api/armoring/cena", {ownArmperiod: $.toJSON(self.armoring.sel), id: self.json.id, cena: cena }, function(data) {
					data = $.parseJSON(data)
					self.armoring.copy(self.armoring.armor, self.armoring_cost)
					self.armoring.clear()

					self.armoring_cost.armor.id = data.id
					self.armoring_cost.armor.cena = cena
					self.armoring_cost.save_sel(3)
				})
				return false
			});
			
			$("#realty-dp-anymoney").on( 'click', function (e) {
				e.preventDefault();

				var date = self.$dp.datepicker("getDate")
				var a = self.armoring_cost.get(date)
				var arm
				var cost = $("#realty-i-money")
				var cena = cost.val()
				
				if(!cost.valid()) { cost.qtip("show"); return false }
				if(!self.armoring.sel.length) { self.show_tip("Выделите период"); return false }
				
				if(a) $.each(a, function() {
					if(this && this.opt==3) { arm = this; return false }
				})
				
				if(arm) $.post("/api/armoring/cena/set", {id: arm.id, cena: cena }, function() {
					self.show_tip("Цена изменена")
					self.armoring.clear()
					for (var i = 0; i < self.armoring_cost.armoring.length; i++){
						if (self.armoring_cost.armoring[i].id == arm.id){
							self.armoring_cost.armoring[i].cena = cena
						}
					}
					self.dp_refresh();
				}); else self.show_tip("Нажмите на дате с ценой")
				return false
			});
		
			$("#realty-dp-nomoney").on( 'click', function (e) {
				e.preventDefault();

				var date = self.$dp.datepicker("getDate")
				var a = self.armoring_cost.get(date)
				var arm
				
				if(a) $.each(a, function() {
					if(this && this.opt==3) { 
						arm = this; return false 
					}
				})
				
				if(arm) $.post("/api/armoring/erase", {id: arm.id}, function(data) {
					self.armoring_cost.remove(arm)
					self.armoring_cost.armoring.splice($.inArray(arm, self.armoring_cost.armoring), 1);
				}); else self.show_tip("Нажмите на дате с ценой")
				return false
			});

//s:13
			$("#realty-selarmoring-fromtime, #realty-selarmoring-totime").on( 'change', function () {
				var date = $("#realty-selarmoring-list option:selected").text(),
					dates,
					pos,
					str

				dates = date.match(/(\d{2})\.(\d{2})\.(\d{4})/ig);
				pos = date.indexOf("-");

				if ( this.id === "realty-selarmoring-fromtime" )
					str = dates[0] +" "+ $(this).val() + date.substr(pos, date.length)
				else
					str = date.substr(0, pos+1)+" "+dates[1] + " " +$(this).val()

				self.$list.find("option:selected").text(str)
				//изменить стили
				//self.setStyleItemDP(dates[0], $(this).val())
			});

			/*self.$list.change( function(){
				var times = self.$list.find("option:selected").text().match(/(\d{2}):(\d{2})/ig);

				$("#realty-selarmoring-fromtime").val( times[0] ? times[0] : '12:00' );
				$("#realty-selarmoring-totime").val( times[1] ? times[1] : '12:00' );
			});*/
//e:13
			
			$(".app-reservation-btn").button().on( 'click', function (e) {
				e.preventDefault();

				var sel = self.armoring.sel
				if(sel.length == 0) {
					dialogError("Выберите период", "Заявка на бронирование", 1)
					return
				}
				
				$.post("/api/core/me/load", function(data) {
				
					$("#realty-armoring-form").form("reset")
					
					var user = $.parseJSON( data );
					data = self.$realty.getFormData();

					var period = $.map(sel, function(a) {
						return $.datepicker.formatDate('dd.mm.yy', a.fromdate)+'-'+$.datepicker.formatDate('dd.mm.yy', a.todate)
					}).join(", ")
					$("#realty-armoring-date").val(period)
					user.email = app.util.rowsToArray(user.email)[0]
					user.phone = app.util.rowsToArray(user.phone)[0]
					var email = (user.email) ? user.email.contact : ""
					var phone = (user.phone) ? user.phone.contact : ""
					
					$("#realty-armoring-email, #realty-armoring-phone, #realty-armoring-fio").off("change", self.onChangeInfoUser)
					
					
					
					$("#realty-armoring-form").setFormData({
						address: data.address,
						fio: user.info.name,
						email: email,
						phone: phone,
						count: 1,
						desc: '',
						ownArmperiod: $.toJSON(self.armoring.armor.ownArmperiod),
						realty_id: $("#realty-card input[name=id]").val(),
						currency_id: $("#currency-change option:selected").val()
					}).dialog( "open" );
					
					$("#realty-armoring-email, #realty-armoring-phone, #realty-armoring-fio")
						.on("change", self.onChangeInfoUser)
					
					$("#realty-armoring-form")
						.find("textarea,input,select").keyup()
					$("#realty-armoring-form")
						.find("[name=address],[name=fio],[name=email],[name=phone]")
						.each( function() {
							if($(this).valid()) this.disabled = true
						});
					
					$("#realty-armoring-date").attr("disabled", true)
					
					$("#realty-armoring-form").form({
						event: {
							store_success: function(option, data) {
								self.armoring.save_sel(4)
								$("#realty-armoring-dlg").dialog("open")
								var row = {armoring_id: data.id, fromdate: data.fromdate, todate: data.todate}
								app.event.run("service-add", row)
								this.dialog("close")
								return false
							}
						}
					});

				});

				return false
			});
		}
	};

	app.exports.armoring = {
		init: function() {		// инициализация календаря
			$("#plugin-armoring").pluginInit();
			createArmoring.setHandler();

			app.event.add( "armoring", "create-armoring", function (data) {
				createArmoring.init( data );
			});

			app.event.add( "armoring-refresh", "refresh-armoring", function(data){
				$("#realty-armoring-form").dialog("close");
			});


			$("#plugin-armoring #armoring-form").appendTo( $("#realty-arm-form") );

			$( "#realty-armoring-form" ).dialog({
				autoOpen: false, modal: true,
				width: '700px'
			}).form();

			$( "#plugin-armoring #calendar" ).appendTo("#armoring");
		}
	}
}());