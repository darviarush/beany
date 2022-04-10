/**
 * Equipment
 */

app.exports.realty.shorts = {
	equipment: {
		//  @private
		widget_tip: [
			"Стиральная машина", "Телевизор", "Телефон", "Музыкальный центр",
			"Интернет", "Кухня", "Кондиционер",
			"Можно проживать с животными", "Можно ли проживать с детьми", "Элитная квартира"
		],
		//  @public -shorts
		applyWidget: function ($node, equip) {
			var i = 0,
				tips  = this.widget_tip,
				len = tips.length;

			for (; i < len ; i += 1) {
				if (equip & (1 << i)) {//   BITWISE!
					$("<div />").appendTo( $node )
						.css( "background-image", "url("+ app.conf.theme +"img/equipment.png)")
						.css( "background-position", (-i*1.875) +"em 0")
						.qtip({
							content: _( tips[ i ] )
						});
				}
			}
		}
	},
	equipmentWidget: function ($node, code) {	// переписывает картинки
		this.equipment.applyWidget( $node.html(''), parseInt( code, 10 ) );
	},
	createEquipmentWidget: function ( $equip, equip_code, callback ) {
		this.equipmentWidget( $equip, -1 );

		$equip.attr("equip_code", equip_code );

		$equip.children().each( function (idx) {
			var $ctx = $( this );

			if ( parseInt( equip_code, 10 ) & (1 << idx) ) $ctx.addClass( 'app-equipment-active' );

			$ctx.on( 'click', function () {
				var value = $equip.attr("equip_code"),
					code = parseInt( value, 10 ) ^ (1 << idx);

				$ctx.toggleClass( 'app-equipment-active' );
				$equip.attr("equip_code", code )
				callback( code );
			});
		});
	}
};