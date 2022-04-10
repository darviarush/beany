
(function () {
	$("#application-send").pluginInit().children('*').appendTo($("#realty-tab-inform"))
	
	app.event.add("send-application", "create-application", function(id) {	
		$.post('/api/inform/application/load', {id: id}, function(data) {	
			data = $.parseJSON(data);
			data = app.util.rowsToArray(data);
			
			var listApplication = $("#application-list-send"),
				trfirstApplication = $("tr:first", listApplication)
				save = $("[name=save]",listApplication).val(),
				erase = $("[name=erase]",listApplication).val();
				
			trfirstApplication.hide();
			$("tr:not(:first)", listApplication).remove();
			
			for (var i = 0; i < data.length; i++) {
				data[i].save = save;
				data[i].erase = erase;
				var f = trfirstApplication.clone().appendTo(listApplication);
				f.form("data", data[i]).show();
			}
			
			$("[type=button]",listApplication).each(function(){				
				$(this).on('click', function() {
					var self = $(this),
						tr = self.parent().parent();
						
					$.post('/api/inform/application/store',{id: id, 
															armoring_id: $("[name=armoring_id]", tr).val(), 
															event: self.attr("name")}, 
					function(data){
						tr.empty();
					})
				})
			})
		})
	});
})();