/**
 * CARD OFFER
 */
(function () {
	var rent = app.exports.realty;

	console.log( '@CARD_OFFER' );

	var rentCard = {
		$node: $( "#realty-card" ),
		$city: null,
		place: {}
	};
	rentCard.$city = $( "[ name=city ]", rentCard.$node );

	//  exports
	rent.rentCard = rentCard;

	rentCard.$node.form({
		event: {
			store: function (options, data) {
				if ( "comment" in data ) {
					data.comment = $.trim( data.comment );

					this.form( "val", "comment", data.comment );
				}
			}
		}
	});
	// карта ??? hack !!! or useless
	// var map;
	rentCard.$city.on( 'change', function () {
		$.post( "/api/realtyList/city/store", {
			id: rentCard.$node.find("input[name=id]").val(),
			place_id: rentCard.place.id,
			time_change: rentCard.$node.find("input[name=time_change]").val(),
			country_id: rentCard.place.country_id //todo
		}, function (data) {
			data = $.parseJSON( data );
			rent.steal.base.arrayToSelect( data, 1, "metro_sel", "district_sel" );
			
			rentCard.$node
				.form("val", "district_id", data )
				.form("val", "metro_id", data )

			app.event.run( "realtyList.city.load" );
			//map.set_sel("metro", map.metro );
			//map.set_sel("district", map.district );
		});
	});


	//  todo lazy?
	//
	/*rent.offers = (function () {
		var $owl = $( "#offer" ),
			$check_offer = $( "input[ name=isoffer ]", $owl );

		$check_offer.on( 'click', function () {
			if ( $check_offer.prop( "checked", true ) ) {
				$.post( '/api/core/owner/store', function (){
					app.auth.isowner = true;

					$owl.overlayDialog( "close" );
				});
			}
		});

		var realty_new = function () {
			$.post( "/api/realtyList/store", {
				id: 0,
				currency_id: rent.getCurrency()
			}, function (data) {
				data = $.parseJSON( data );

				if(rent.list) rent.list.getCurrentPanel().list( 'insert', data );

				if ( data.id ) {
					app.overlay.addOwl( '/realty', data.id, true );
				}
			});
		};

		$owl.overlay({
			close: function () {
				//app.overlay.removeOwl( '/offer' );

				if ( app.auth.isowner ){
					realty_new();
				}
			}
		});

		return {
			beforeItem: function () {
				if (!app.auth.isowner ) {
					//app.overlay.addOwl( '/offer', '' );
				} else {
					realty_new();
				}
			}
		}

	}());*/

}());

