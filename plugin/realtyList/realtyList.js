/**
 * Собственно код плагина - в процессе предварительного рефакторинга до разделения на модули
 *
 */
import plugin/realtyList/realty_utils.js

import plugin/realtyList/list/filters.js
import plugin/realtyList/list/informers.js
import plugin/realtyList/list/filter_counters.js

//  bundle
import plugin/realtyList/realty_item_card_offer.js
import plugin/realtyList/realty_item.js
//  bundle
import plugin/realtyList/realty_plugin.js

import plugin/realtyList/item_methods.js

import plugin/realtyList/list/required.js
//
//  time passes
//
	(function($){
		var check = function () {
			console.log( 'see yaa!' );
		};

		$(function () {
			check();//setTimeout( check, 100);
		});
	}(jQuery));