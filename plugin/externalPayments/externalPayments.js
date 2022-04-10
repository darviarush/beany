/**
externalPayments - плагин для 
**/

(function () {
	
	$("#plugin-externalPayment")
		.appendTo("body").pluginInit();
		
	var expternalPayment = $("#externalPayment")
	
	expternalPayment.overlay({
		// инициализируем карточку
		open: function(id) {
			if(!id) {
				dialogError("Не передан номер брони", "Онлайн оплата", 1)
               return
			}
			
			$.post("/api/externalPayments/createArmoringPayment", {id : id}, function (data) {

				data = $.parseJSON( data );
				
				$("#payment-card").setFormData({
					orderId:data.pay.id,
					serviceName:data.pay.serviceName,
					user_email:data.pay.payerEmail,
					userName:data.pay.payerName,
					recipientAmount:data.pay.paymentAmount,
					eshopId:data.eshopId,
					recipientCurrency:data.currency,
					hash:data.hash
				});

			});
		},
		close: function() {
			app.overlay.removeOwl( '/externalPayment' );
		}
	})
	
	
	$("#payment-card").form({
		event: {
				store_success: function(option, data) {
					expternalPayment.overlay("close")
					app.event.run("application-refresh");
				}
			}
		})
}());

