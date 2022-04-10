/**
 * dependent module waits
 */
$( function () {
	//var list = [ 'noticeModule', 'commentModule', 'galleryModule', 'electModule' ];
	/*if ( app.exports.commentModule ) {
	 app.exports.commentModule()
	 }
	 if ( app.exports.noticeModule ) {
	 app.exports.noticeModule();
	 }
	 if ( app.exports.galleryModule ) {
	 app.exports.galleryModule();
	 }
	 if ( app.exports.electModule ) {
	 app.exports.electModule();
	 }*/

	app.overlay.applyDelayedStates( function () {
		var equip_code = 0,
			exposed_realty = app.exports.realty,
			params = app.overlay.use_list_params;

		if ( params[ 'equipment' ] ) {
			equip_code = params[ 'equipment' ];
		}
		//
		//  notify delayed states views
		//
		exposed_realty.bedsHolder
			.init();

		exposed_realty.features
			.selectAbode.init( params[ 'form_id' ] );

		exposed_realty.filters
			.createEquipmentFilter( equip_code );
	});
});