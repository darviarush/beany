/**
comment - плагин добавляет комментарии к карточке недвижимости
**/
app.exports.comment = {
	init: function () {
		var realty_id,
			index = 5,
			realty = $("#realty");
			//index = realty.tabs("length"),
			//id = "comment",
			//title = "Комментариев";
		
		//realty.tabs("add", "#tab-"+ id, "<span>"+ title +"</span> <span></span>", index );

		var counter = $("#tab-comment-counter")	//realty.find("ul:first > li:nth("+ index +") > a > span > span:nth(1)");
		
		$("#plugin-comment").appendTo("#tab-comment").pluginInit();


		app.event.add("login", "comment-login", function () {
			$("#comment-add").show();
		});
		app.event.add("logout", "comment-logout", function () {
			$("#comment-add").hide();
		});
		app.event.add("comment", "count-comment", function (data) {
			counter.text(data);
		});

		var list = $("#comment-list").listCreate({
			url: '/api/comment/load',
			scroll: $("#comment-list"),
			elem: $("#comment-elem"),
			param: {
				limit: 4, order: "id desc"
			},
			scroll: $("#comment-list")
		});

		$("#rating").children()
			.clone().appendTo( $(".star") );

		$("input[name=rating]").val(0);

		realty.bind( 'tabsshow', function (event, ui) {
			console.log("wkl="+$(ui.panel).attr("id")+" selected="+realty.tabs("option", "selected"))
			if ($(ui.panel).attr("id") != "tab-comment") return;
			realty_id = $("#realty-card")[0].id.value;

			list.listCreate({
				param: {
					id: realty_id
				}
			}).list("enable");

			if (app.auth.check()) {
				$.post("/api/comment/img/load", {
					id: realty_id
				}, function ( data ) {
					data = $.parseJSON( data );

					app.event.run( "event-addImg-comment", data );
				});
			}
		})
		.bind("dialogclose", function (event, ui) {
			list.list("disable").list("clean");
		})
		.change( function() {// устанавливаем заголовок вкладки
			console.log("index="+index+" opt_ind="+realty.tabs("option", "selected"))
			if (realty.tabs("option", "selected") == index) realty.trigger("tabsshow", {index: index})
		});
		
		$("#comment-add").form({
			event: {
				store: function(options, data) {
					data.id = realty_id;
				},
				store_success: function(options, data) {
					list.list("insert", data);

					counter.text( parseInt(counter.text(), 10) + 1 );

					$("#comment-add").form("reset")
					$("input[name=rating]").val(0)
					$('#rating').find('.ratings_over').removeClass('ratings_over');
					//здесь обновляем галерею
					app.event.run("event-addImg-comment", [])
				}
			}
		});

		//  Оценка коментариев
		$('#rating .ratings_stars').hover(
			function() {
				var select_start = $("input[name=rating]").val()
				var self = $(this).attr('class').match(/star_([1-5]{1})/)[1]
				$(this).prevAll().andSelf().removeClass('ratings_over').addClass('ratings_vote')
				$(this).nextAll().removeClass('ratings_vote');
				var nextAll = $(this).nextAll();
				$.each(nextAll, function() {
					var star = $(this).attr('class').match(/star_([1-5]{1})/)[1]
					if ( star <= select_start)
						$(this).addClass('ratings_over')
				})
				
			},
			function(){
				$(this).prevAll().andSelf().removeClass('ratings_vote');
				var rating = $("input[name=rating]").val()
				set_votes($('#rating').parent(), rating)
			}
		);
		function set_votes(widget, rating){
			$(widget).find('.star_' + rating).prevAll().andSelf().removeClass("ratings_vote").addClass('ratings_over');
			$(widget).find('.star_' + rating).nextAll().removeClass("ratings_over")
		}


		$('.ratings_stars').on( 'click', function() {
			var star = this
			var widget = $('#rating').parent()
			var rating = $(star).attr('class').match(/star_([1-5]{1})/)[1]
			widget.data('rating', rating)
			$("input[name=rating]").val(rating)
			set_votes(widget, rating)
		})
	}
}