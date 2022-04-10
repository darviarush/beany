/**
notice - плагин для уведомлений пользователей о событиях в квартире
**/
(function () {
	$("#plugin-notice").pluginInit();

	var realty = $("#realty");
	var index = 6 // realty.tabs("length")
	var id = "notice";
	//var title = "Обслуживающий персонал";
	var id_service = "selservice"
	//var title_service = "Дополнительные услуги";

	//realty.tabs("add", "#tab-"+id, "<span>"+ title +"</span> <span></span>", index );

	var counter = $("#tab-notice-counter") // realty.find("ul:first > li:nth("+ index +") > a > span > span:nth(1)");
	
	var index_service = 7 // realty.tabs("length")

	//realty.tabs("add", "#tab-"+id_service, "<span>"+ title_service +"</span> <span></span>", index_service );

	$("#plugin-notice > #realty-tab-serv").appendTo("#tab-"+id);
	
	var counter = $("#tab-selservice-counter") //realty.find("ul:first > li:nth("+index_service+") > a > span > span:nth(1)")
	
	$("#plugin-notice > #realty-tab-dopserv").appendTo("#tab-"+id_service);
	
	var $selservice_date = $( "#realty-selservice-date" ),
		$main_notice_time = $( "#notice-time" ),
		$notice_time = $( "#realty-notice-time" );//    todo 3|4

	//todo trace href
	$main_notice_time.on( 'click', function () {
		app.overlay.addOwl( '/notice-time', '' );
	});
	$selservice_date.on( 'click', function () {
		app.overlay.addOwl( '/realty-selservice-date', 'todo' );
	});
	$("#realty-notice-button").on( 'click', function () {
		$main_notice_time.overlayDialog('close');
	});
	$("#realty-selservice-button").on( 'click', function () {
		$selservice_date.overlayDialog( 'close' );
	});



	app.util.Class("Notice", {
		get_total: function() {
			var balance = parseInt($("#realty-service-balance").text())
			if (!balance) balance = 0
			var total_service = 0
			$.each($("#realty-balance [name=total]"), function(){
				if ($(this).text())
					total_service = total_service + parseInt($(this).text())
			})
			total_service = parseInt(balance) + total_service
			$("#realty-all-total").text(total_service)
		},
		get_service: function (request, response) {
			$.post( "/api/notice/service_all/load", {
					limit: 10,
					name_startsWith: request.term
				},
			function (data) {
				data = $.parseJSON( data );
				data = app.util.rowsToArrayOpt( data );

				response( $.map( data, function (item) {
					return {
						label: item.name,
						value: item.name
					}
				}));
			})
		},
		/*create_service: function() {
			var elem = $( this ),
                $service = $("#realty-service-notice");

			if (!elem.prop("select")) {
				elem.prop("select", 1);

				var container = elem.parent();
				if (!$service.prop( "notice_empty" )) {
					var clon;

					if (!('#clone-service-notice').length)
						clon = $service.clone( true )
                            .attr("id", "clone-service-notice" );
					else 
						clon = $service;

					clon.removeClass("off")
                        .appendTo( container );

					var table = container.parent().parent(),
                        armoring_id = 0;

					if (container.parent().parent().is("tr"))
						 armoring_id = table.find("[ name=armoring_id ]").val();

					$.each( $("#clone-service-notice [ name=realty-selservice-date ]" ), function () {
                        var $ctx = $( this ),
                            grandpa_name = $ctx.parent().parent().find("[ name=id ]").val();

						$ctx.attr("href", "#realty-selservice-date="+ grandpa_name +"="+ armoring_id);
					});
				
					$.post("/api/notice/service/status/load", {
                        armoring: armoring_id
                    }, function (data) {
					    data = app.util.rowsToArrayOpt( $.parseJSON(data) );

						$.each( $("#clone-service-notice [ name=status ]" ), function () {
                            var $ctx = $( this ),
                                grandpa_name = $ctx.parent().parent().find("[ name=id ]").val();

							$ctx.prop("checked", false);
                            //  todo цикл внутри цикла

							for (var i = 0, item, len = data.length; i < len; i += 1 ) {
                                item = data[i];

								if (item.id == grandpa_name && item.status)
									$ctx.prop("checked", true);
							} 
						});
					});
				}
			}
			else {
				elem.prop("select", 0);

				$("#clone-service-notice")
                    .addClass("off");
			}
		},*/
		create_service: function() {
			var elem = $(this)
			if (!elem.prop("select")){
				elem.prop("select", 1)
				var container = elem.parent()
				if (!$("#realty-service-notice").prop("notice_empty")){
					var clon
					if (!$("#clone-service-notice").length)
						clon = $("#realty-service-notice").clone(true).attr("id","clone-service-notice")
					else
						clon = $("#clone-service-notice")
					clon.appendTo(container)
					if (clon.hasClass("off"))
						clon.removeClass("off")
					var table = container.parent().parent()
					var armoring_id = 0
					if (container.parent().parent().is("tr"))
						 armoring_id = table.find("[name=armoring_id]").val()
					$.each($("#clone-service-notice [name=realty-selservice-date]"), function(){
						$(this).attr("href", "#realty-selservice-date="+$(this).parent().parent().find("[name=id]").val()+"="+armoring_id)
					})

					$.post("/api/notice/service/status/load", {
                        armoring: armoring_id
                    }, function(data){
					    var data = app.util.rowsToArrayOpt( $.parseJSON(data) );

						$.each($("#clone-service-notice [name=status]"), function () {
							var id = $(this).parent().parent().find("[name=id]").val()
							$(this).prop("checked", false);
							for (var i = 0; i < data.length; i++){
								if (data[i].id == id && data[i].status)
									$(this).prop("checked", true);
							}
						})
					})
				}
			}
			else {
				elem.prop("select", 0)
				if (!$("#clone-service-notice").hasClass("off"))
					$("#clone-service-notice").toggleClass("off")
			}
		},
		add_service: function (row) {
			var empty_row = {
					id: '', name: ''
				},
				$period = $("#realty-dopservice-period");

			if ( $period.hasClass("off") ) {
				$period.toggleClass("off")
					.multi("data", [ row ] )
					.find("[name=id]").remove()
			} else {
				$period.multi({
					event: { 
						multi_add: function (tr) {
							tr.form("reset");
							tr.form("data", row);
							tr.find("[name=realty-dopservice-sel]")
								.click( notice.create_service );
						}
					}
				}).multi("add", 1).find("[name=id]").remove()
			}

			$("#realty-balance").multi("clean");
			if ( $period.hasClass("off") ){
				$period.toggleClass("off");//   second time?
			}
			$("#realty-payment-balance").toggleClass("off");

			$("#clone-service-notice [name=status]").prop("checked",false)
			$("#realty-service-balance, #realty-total-arenda, #realty-list-date, #realty-all-total,#realty-balance span").text("")
		},
		multi_data: function (elem, data) {
			if (data) {
				//var data = app.util.rowsToArrayOpt( data );
				elem.multi("data", app.util.rowsToArrayOpt( data ));
			}
		},
		multi_clean: function (elem) {
			elem.multi("clean");
		}
	});
	
	var notice = new app.classes.Notice();
	
	app.event.add("my-notice", "my-notice", function (data) {
		notice.multi_data($("#realty-notice"), data );
		/*notice.multi_clean($("#realty-service-notice"))
			
		$("[ name=where ][ type=radio ]", $notice_time ).click(function(){
			$("#realty-notice-where [name=where]").val($(this).val()).keyup().change()
		})
		$("#realty-notice [name=service]").autocomplete({
			source: notice.get_service,
			minLength: 2,
			select: function( event, ui ) {
			},
			open: function() {
				$( this ).removeClass( "ui-corner-all" ).addClass( "ui-corner-top" )
			},
			close: function() {
				$( this ).removeClass( "ui-corner-top" ).addClass( "ui-corner-all" )
			}
		})*/
	});

	// инициализация мультитаблицы
	$("#realty-notice").multi({
		event: {
			store: function(opt, data) { 
				data.realty_id = $("#realty-card").form("id") 
			},
			paste: function(data) {
				if (data){
					data["notice-time"] = "#notice-time="+data.id
				}
			},
			store_success: function (opt, data) {
				this.find("[name=notice-time]").attr("href", "#notice-time="+data.id)
			},
			multi_add: function (f) {
				this.find("[name=service]").autocomplete({
					source: notice.get_service,
					minLength: 2,
					select: function( event, ui ) {},
					open: function() {
						$( this ).removeClass( "ui-corner-all" ).addClass( "ui-corner-top" )
					},
					close: function() {
						$( this ).removeClass( "ui-corner-top" ).addClass( "ui-corner-all" )
					}
				});
				this.find("[ name=notice-time ]:last").attr("href", "#notice-time="+0)
			}
		}
	});
	
	function focus_count(){
		$("#realty-service-time [name=period][type=radio][value=4]").click();
	}
	function focus_day(){
		$("[ name=where ][ type=radio ][ value=4 ]", $notice_time ).click();
	}
	
	//  Проставляет в форму значение на открытие overlay с услугами
	//
	$selservice_date.overlay({
		open: function (notice_id, armoring_id) {
            var $service = {
                    time: $("#realty-service-time"),
                    booked: $("#realty-service-booked")
                };

			notice_id = parseInt( notice_id, 10 );
			armoring_id = parseInt( armoring_id, 10 );

            $service.time.hide();
            $service.booked.hide();
            //  todo ? why show and hide
			if (!armoring_id) {
                $service.time.show();
            } else {
                $service.booked.show();
            }

			$.post("/api/notice/service/time/load", {
                notice_id: notice_id,
                armoring_id: armoring_id
            }, function (data) {
                var i = 0;

				data = $.parseJSON( data );

				if (!armoring_id) {
					$service.time.form("reset");
					$.each($("[ name=period ][ type=radio ]", $service.time ), function () {
					    i += 1;
						$(this).val( i ).prop("checked",false);
					});

					if (data) {
                        $service.time.form("data", data);
                    } else  {
						$("[ name=id ]", $service.time ).val(0);
                    }
						
					$("#realty-service-time>[ name=day ],[ name=count_service ]").bind("focus", focus_count);
                    $service.time.form( "params", {
                        notice_id: notice_id,
	                    armoring_id: armoring_id
                    });
				} else {
                    $service.booked.form("reset");
					if (data) {
						switch (data.period) {
							case 1: data.period = "Однократно"; break;
							case 2: data.period = "Ежедневно"; break;
							case 3: data.period = "Еженедельно"; break;
							case 4: data.period = data.count_service + " раз в " + data.day + "дней"; break;
							default: data.period = "Период не указан";
						}
                        $service.booked.form("data", data );
					}
				}
			})
		},
		close: function () {
			$("#realty-service-time > [name=day],[name=count_service]")
				.unbind( 'focus', focus_count );

			app.overlay.removeOwl( '/realty-selservice-date' );
		}
	});

	function focus_getNoticeTimeItem (idx) {
		var query = '[ name=where ][ type=radio ][ value={$idx} ]';

		return $( query.replace( '{$idx}', idx ), $notice_time );
	}
	function focus_day(){
		focus_getNoticeTimeItem( 3 ).click();
	}
	function focus_day_last(){
		focus_getNoticeTimeItem( 4 ).click();
	}

	//  Проставляет значение в форму на отрытие overlay c обслуживающим персоналом
	$main_notice_time.overlay({
		open: function(id) {
			id = parseInt( id, 10 );

			$.post("/api/notice/load", {
				id: id
			}, function (data) {
				data = $.parseJSON( data );

				$notice_time.form( "reset" );

				//var i = 0;
				$.each( $("[ name=where ][ type=radio ]", $notice_time ), function (i, v) {
					//i++;
					$(this).val( i +1 )
						.prop( "checked", false );
				});//notice-where-radio

				$notice_time.form({
					minor: $("#realty-notice [ name=id ][value="+id+" ]").parent().parent(),
					overlay: $main_notice_time
				}).form( "data", data );
							
				$("#realty-notice-time [name=day]:first").on("focus", focus_day);
				$("#realty-notice-time [name=interval]").on("focus", focus_day_last);
				$("#realty-notice-time [name=day]:last").on("focus", focus_day_last);
			})
		},
		close: function(){
			$notice_time.form( "reset" );

			$("#realty-notice-time [name=day]:first").off("focus", focus_day);
			$("#realty-notice-time [name=interval]").off("focus", focus_day_last);
			$("#realty-notice-time [name=day]:last").off("focus", focus_day_last);

			app.overlay.removeOwl( '/notice-time' );
		}
	});


    //  Дополнительные услуги
	app.event.add( "notice-service", "service-show", function (data) {
        var $notice = $("#realty-service-notice"),
            $period = $("#realty-dopservice-period");

		$("#realty-service-table").append( $("#realty-balance") );
		
		notice.multi_data( $notice, data.notice );
        $notice.multi({
            hide_buttons: true
        });
		
		var prop = data.notice ? 0 : 1;
        $notice.prop("notice_empty", prop );

		notice.multi_data( $period, data.armoring );
        $period.find("[ name=id ]").remove();
		
		var date_arm = app.util.rowsToArrayOpt( data.armoring );

		if (date_arm.length && $period.hasClass("off")) {
            $period.toggleClass("off");
        }
        $period.multi({
            hide_buttons: true
        });
		
		$("#realty-service-date").datepicker({
			changeMonth: true,
			changeYear: true,
			minDate: 0, 
			maxDate: "+1y",
			dateFormat: "yy-mm-dd"
		})//.change(function(){});
		
		$("[ name=status ]", $notice ).on( 'click', function () {
			var tr = $(this).parent().parent(),
				id = tr.find( "[name=id]" ).val(),
				table_tr = tr.parent().parent().parent().parent().parent(),
				armored_id = 0;

			if ( table_tr.is("tr") ) {
				armored_id = table_tr.find( "[name=armoring_id]" ).val();
			}

			$.post("/api/notice/service/status/store", {
                notice_id: id,
				armoring_id: armored_id,
                status: $(this).prop("checked") ? 1 : 0
            }, function () {
			    $.post("/api/notice/service/load", {
                    realty_id: $("#realty-card input[name=id]").val()
                }, function (balance) {
					$("#realty-balance")
                        .multi("data", app.util.rowsToArrayOpt(balance) )
                        .find("[name=id]").remove();
				});
			});
		});
		
		$("[name=realty-dopservice-sel]")
			.off( 'click' )
			.prop( "select", 0)
			.on( 'click', notice.create_service );
		
		$("#realty-service-time [name=period][type=radio]").on( 'click', function () {
			var value = $(this).val();

			$("#realty-service-period [name=period]").val( value )
				.keyup().change();
		});
		
		$("#realty-balance").multi({
            hide_buttons: true
        });
		
		$("#realty-payment").on( 'click', function () {
			var $payment_balance = $( "#realty-payment-balance" ),
				use_load = $payment_balance.hasClass("off");

			$payment_balance.toggleClass("off");

			$.post( "/api/notice/service/load", {
				realty_id: $("#realty-card input[name=id]").val()
			}, function (balance) {
					$("#realty-balance").multi("data", app.util.rowsToArrayOpt( balance )).find("[name=id]").remove()
					if ( balance ){
						$("#realty-balance-all").show();

						$.each( $("#realty-balance span"), function () {
							if ($(this).hasClass("off"))
								$(this).removeClass("off").addClass("on");
						})
					}
					notice.get_total()
			});

		});

		$("#realty-payment-all").show()
	});
	
	//Подсчитываем баланс для выбранного периода
	app.event.add("total", "set-total", notice.get_total );
	app.event.add("service-add", "service-row", function (row) {
		notice.add_service( row );
	});
})();