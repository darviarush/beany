/**
gallery - плагин для галереи в карточке квартиры
**/
(function () {
	//var realty_id
	var realty = $("#realty")
	var index = 3 //realty.tabs("length")
	//var id = "fotogallery"
	//var title = "Фотогаллерея"
	
	//realty.tabs("add", "#tab-"+id, "<span>"+title+"</span> <span></span>", index)
	$("#plugin-gallery").pluginInit()
	
	var $counterImg = $("#tab-fotogallery-counter") //realty.find("ul:first > li:nth("+index+") > a > span > span:nth(1)");
	
	app.plugin.gallery = {
		open_gallery: function () {
			$("#realty").tabs( "select", index );
		}
	};
	
	app.util.Class( "Gallery", {
		realty_id: null,
		patch: null,
		ischange: null, 
		user_id: $("#realty-card input[name=user_id]"),
		selectedImg: null,
		counterImg: 0,
		description: "",
		resetGallery: function () {
			var gallery = $("#realty-card .app-foto-gallery a" ),
				src = gallery.find("img:first").attr("src");

			view3 = $("#realty-list-0 > div:first")
				.hasClass("app-elem-3");

			if (!src ) {
                src = app.conf.theme + (view3 ? "images/object-view-large.jpg" : "images/object-view-small.jpg");
            } else if(view3) {
                src = src.replace(/0.png$/, "2.jpg");
            }
			
			$( "#realty-list-0, #realty-list-1" )
                .listGetItemById( this.realty_id )
                .find( "img:first" ).attr( "src", src );
		},
		/*** 
			ctx - div галлереи, imgs-массив картинок, isBigImg, большая картинка, ischange пользователь может изменять галлерею,  
			isdata-true картинка загружается и в фотогаллерею и на первую вкладку, limit картинок на первой вкладке
		***/
		addImg: function ($ctx, imgs, isBigImg, ischange, isdata, limit){ 

			var self = this,
				gallery = $( ".app-foto-gallery", $ctx ),
				href;
			
			if (!isdata && $ctx.attr("id") == "realty-foto-gallery" ) {
				console.log("realty-foto-gallery")
				if ($("#gallery .app-foto-gallery a").length < 3) {
					self.addImg($("#gallery"), imgs.slice(0, (3-$("#gallery .app-foto-gallery a").length)), false, false, false, 3)
				}
				self.setCounterImage("add",imgs.length)
			}
			
			if (!isdata && $ctx.attr("id") == "realty-card") {	
				console.log("realty-card")
				self.addImg($("#realty-foto-gallery"), imgs, true, true, false)
				self.setCounterImage("add", imgs.length)
			}
			
			self.counterImg = $(".app-foto-gallery a", $ctx).length
			
			$(imgs).each(function(idx, img_id) {
				if (!limit || self.counterImg < limit) {
					if (limit) ++self.counterImg
					
					href = isBigImg ? "#" : app.helper.img(img_id)
					var img
					var a = $("<a></a>").attr("href", href)
										.appendTo(gallery)
										.append( img = $("<img />").attr("src", app.helper.img_preview(img_id)) )
										.attr("name", app.helper.img(img_id))
										.attr("id", "app-img-"+img_id)
					if (isBigImg) {
						a.on("click", function(){ 
							if ($ctx.attr("id") == "realty-card")  app.plugin.gallery.open_gallery(); 
							self.setBigImg($(this), $ctx); return false;
						})
					}
					
					if(app.auth.user(self.user_id.val()) && ischange) {
						img.qtip({content: "Перетащите мышкой изображение, чтобы изменить его положение среди других изображений"})
						$("<img />").addClass("app-img-erase").attr("src", app.conf.theme + "img/erase.png")
							.appendTo(a)
							.on( 'click', function() {
								var erase = $(this)
								dialogError("Вы действительно хотите удалить это изображение?", "Удаление изображения", 1, {"Удалить": function() {
									$(this).dialog("close")
									$.post("/api/gallery/"+self.patch+"erase", {id: self.realty_id, img_id: img_id}, function() {	// удаление из DOM
										if ($(".app-scroll", $ctx).length) {
											self.eraseFoto($ctx, erase)
										}
										erase.parent().remove()
										self.resetGallery()
									})
								}})
								return false
							})
						gallery.sortable({
							update: function(event, ui) {
								var target = app.util.id_from_src( ui.item.find(":first").attr("src"))
								var before = app.util.id_from_src( ui.item.prev().find(":first").attr("src"))
								$.post("/api/gallery/"+self.patch+"sort", {id: self.realty_id, target: target, before: before }, function () {
									self.resetGallery()
								})
							}
						})
					}
					else gallery.sortable("destroy")
				}
			})			
			if ($ctx.attr("id") == "realty-foto-gallery"&&!$("#realty-foto-view", $ctx.parent()).attr("src")){
				self.setBigImg($(".app-foto-gallery>a:first", $ctx), $ctx)
			}
			self.resetGallery()
		},
		init: function($ctx, patch, isBigImg, ischange, limit){
			this.patch = patch;
			this.realty_id = $("#realty-card input[name=id]").val()
			var action = "/api/gallery/"+this.patch+"store";
			var self = this
			this.description = $("#desc").text()
			
			function seturl() {	// устанавливает url
				return $ctx.find(".app-add-image").attr("src", "/addimage.html?"+Math.random())
			}

			function img_error(msg) {
				dialogError("Фото не было загружено. Возможно оно слишком велико. "+msg, "Ошибка! Загрузка изображения", 1)
			}
			
			function img_handler() {
				app.preloader.stop();

				var html 
				try {
					html = $(this).contents().find("body").text()
				} catch(e) {
					img_error("Защищённая страница")
				}
				
				if(String($(this).contents().get(0).location).search(/\/addimage.html|about:blank/) != -1){ 
					var id = $("#realty-card [name=id]").val()
					$(this).contents().find("form").attr("action", action)
					$(this).contents().find("[name=id]").val(id)
					return;
				}
				
				var json
				try {
					json = $.parseJSON(html)
					if(json && json.error) dialogError(escapeHTML(json.message)+"<p /><pre>"+escapeHTML(json.trace)+"</pre>", "Загрузка изображения. Ошибка № "+json.code)
					else {
						self.addImg($ctx, json, isBigImg, ischange, false, limit)
					}
				} catch(e) {
					img_error(html)
				}
				
				seturl()
			}

			seturl()
				.load(img_handler)
				.error(img_handler)
			$ctx.find(".app-add-image-btn").button()
		},
		handler: function($ctx, user_id) {
			var self = this
			$("input[id=foto-prev],[id=foto-next]").click(function(){
				self.getBigImg($(this), $ctx);
			})
			$(".app-scroll", $ctx).scroll(function(){
				if ($(".app-scroll").get(0).scrollLeft == $(".app-scroll").get(0).scrollWidth - $(".app-scroll").get(0).clientWidth){
					self.loadImg($ctx, $ctx.find(".app-foto-gallery>a").length-1)
				}
			})
			if (app.auth.user(user_id)) {
				$($("#desc")).click(function(){
					var $descWidtch = ($(this).width()<100)?100:$(this).width();
					var $descHeight = ($(this).height()<100)?100:$(this).width();
					$(this).hide();				
					$("#desc-text").width($descWidtch)
					$("#desc-text").height($descHeight)
					$("#desc-text").text($(this).text())
					$("#desc-text").show()
				})
				
				$("#desc-text").change(function(){
					var img_id = $(".app-foto-gallery", $ctx).find(".app-sel-foto").attr("id").match(/\d+$/i)[0]
					var content = $("#desc-text").val()
					$.post("/api/gallery/desc/store", {id: self.realty_id, img_id: img_id, desc: content}, function(){
						$("#desc").text(content)
						$("#desc-text").hide()
						$("#desc").show()
					})
				})
			}
		},
		setBigImg: function(elemNext, $ctx) {
			var self = this
			var $fotogallery = $("#realty-foto-gallery")
			if ($fotogallery.length) {
				
				if ($fotogallery.index(elemNext) == -1) { 
					elemNext = $("a[name='"+elemNext.attr("name")+"']", $fotogallery);
				}
				
				$(".app-foto-gallery", $fotogallery).find(".app-sel-foto").removeClass("app-sel-foto")
				elemNext.addClass("app-sel-foto")
				var src = elemNext.attr("name")
				if (elemNext.length) {
					$.post("/api/gallery/description/load", {img_id: elemNext.attr("id").match(/\d+$/i)[0]}, function(data){
						data = $.parseJSON(data)
						var desc = data.description
						if (!desc) {
							desc = self.description; 
						}
						$("#desc").text(desc)
					
					})
				}
				if (!src) src = ""
				$("#realty-foto-view", $fotogallery.parent()).attr("src", src);
				$('.app-scroll', $fotogallery).scrollLeft(this.getLeftScroll($fotogallery, elemNext))
			}
		},
		getBigImg: function(event, $ctx) {
			var elem
			var elemSel = $("a[name='"+$("#realty-foto-view").attr("src")+"']", $ctx)
			if (event.attr("id")=="foto-next"){
				elem = elemSel.next()
				if (!elem.length) {
					elem = $(".app-foto-gallery>a:first", $ctx)
				}
			} else {
				elem = elemSel.prev()
				if (!elem.length) {
					elem = $(".app-foto-gallery>a:last", $ctx)
				}
			}	
			this.setBigImg(elem, $ctx);
		},
		getLeftScroll: function($ctx, elem) { 
			var $allElem = $ctx.find(".app-foto-gallery>a")
			var $scroll = $(".app-scroll", $ctx).get(0)
			if ($allElem.length > 1) {
				var position = ($scroll.scrollWidth - $scroll.clientWidth)*$allElem.index(elem)/($allElem.length-1);
				return position;
			} 
			return 0;
		},
		loadImg: function($ctx, index) {
			var self = this
			$.post("/api/gallery/list/"+this.patch+"load",{id:self.realty_id, offset: (index+1), limit:3}, function(data){
				data = $.parseJSON(data);
				self.addImg($ctx, data.id, true, true, true);// при добавление проблема с 
			})
		},
		eraseFoto: function($ctx, erase) {
			var $scroll = $(".app-scroll", $ctx).get(0)
			if ($scroll.scrollWidth <= $scroll.clientWidth){
				this.loadImg($ctx, $ctx.find(".app-foto-gallery>a").length-1)
			}
			var elem_card = $("#realty-card a[name='"+erase.parent().attr("name")+"']")
			if (elem_card.length){
				elem_card.remove()
				--this.counterImg;
			}
			this.setCounterImage("remove", 1)
			var eraseParent = erase.parent();
			var elem =(eraseParent.next().length) ? eraseParent.next() : eraseParent.prev()
			this.setBigImg(elem, $ctx);
		},
		setCounterImage: function(event, count){
			var counterImg
			counterImg = Number($("span[name=counter-image]:first").text())
			if (event == "add") {
				counterImg += count;
			} else {
				counterImg -= count;
			}
			$("span[name=counter-image]").each(function(){
				$(this).text(counterImg)
			});
			$counterImg.text(counterImg)
		}
	});

	//загрузка фото для RealtyList
	var gallery = null
	var gallery_comment = null;
	var $container = $("#plugin-gallery").find("#gallery-container")
	$container
		.appendTo( $("#gallery") );
	$container
		.clone().appendTo( $("#gallery-comment") );
	
	function addImageHandler (holder, $node, holder_name, imgs, isBigShow, ischange, limit) {
		
		if (!holder) {
			holder = new app.classes.Gallery( $node, holder_name, isBigShow, ischange, limit);
		}
		
		$(".app-foto-gallery", $node )
			.html('');
		holder
			.addImg( $node, imgs, isBigShow, ischange, true, limit );
		
		return holder;
	}
	app.event.add("event-addImg", "addImg", function (imgs) {
		var limit = 3,
			$gallery = $("#gallery");

		console.log( "event-addImg", imgs.id );

		gallery = addImageHandler( gallery, $("#realty-card"), '', imgs.id.slice(0,limit), true, false, limit);
		$( "[name=counter-image]", $gallery ).text(imgs.counter)
	});
	
	//Загрузка фото для комментарий
	app.event.add("event-addImg-comment", "addImg-comment", function(imgs){
		var $comment = $("#comment-add")
		$("#gallery-all-image",$comment).after($("#gallery-all-image",$comment).text())
		$("#gallery-all-image",$comment).remove()
		addImageHandler( gallery_comment, $comment, "comment/", imgs, false, true);
		$("[name=counter-image]", $comment).remove()
		$("#gallery-comment div")
			.find(".off").removeClass("off").addClass("on")
	})
	app.event.add("show_foto", "foto", function(data) {
		$("#desc-text").hide()
		var gallery_foto = null;
		var $fotogallery = $("#realty-foto-gallery")
		$counterImg.text(data.imgs.counter)
		if (!$("#realty-list-foto", $fotogallery).length){
			$("#fotogallery").appendTo($("#tab-fotogallery"))// формируем вкладку фотогаллереи
			$container.clone()
						.attr("id","realty-list-foto")
						.appendTo($fotogallery);
			$fotogallery.find(".app-foto-gallery").wrap("<div class='app-scroll'></div>");//
		}
		gallery_foto = addImageHandler( gallery_foto, $fotogallery, "", data.imgs.id, true, true);
		
		var user_id = gallery_foto.user_id.val()
		gallery_foto.handler($fotogallery, user_id)
		gallery_foto.setBigImg($(".app-foto-gallery>a:first", $fotogallery), $fotogallery)
		
		if (app.auth.user(user_id))
			$fotogallery.find(".off").removeClass("off").addClass("on")
	})
})();

