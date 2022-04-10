/**
map - плагин для 
**/

(function () {
	var map,
        address;

	app.util.Class("GoogleMap", {
        onAddressChange: function() {
            var $card = this.$card;

            this.change = true;
            this.to_address();

            var user_id = $("input[ name=user_id ]", $card ).val(),
                location;
            if (app.auth.user( user_id )) {
                location = this.map.getCenter();

                $.post("/api/realtyList/store", {
                    id: $("input[ name=id ]", $card ).val(),
                    longitude: location.Ya,
                    latitude: location.Xa
                });
            }
        },
        $card: $("#realty-card"),
        //
        init: function() {
            console.log("this", this);
            var self = this,
                address = this.address = $("#realty-card input[ name=address ]"),
                map_elem = this.map_elem = $("#realty-card .app-map");

            this.geocoder = new google.maps.Geocoder();
            var map = this.create();
            //  можно устанавливать места
            this.change = false;

            address.change( $.proxy(this.onAddressChange, this) );

            var parent_map, parent_address,
                width, height;

            $("#realty").bind("tabsshow", function (event, ui) {
                //  перебрасываем на другую вкладку
                if(/#realty-tab-map$/.test(ui.tab)) {
                    parent_address = address.parent();
                    console.log("address_parent", address.parent());

                    parent_map = map_elem.parent()
                    var tab = $("#realty-tab-map")

                    var img = address.next()
                    tab.prepend(address).append(map_elem)
                    address.after(img)
                    width = map_elem.css("width")
                    height = map_elem.css("height")
                    map_elem.css("height", "600px").css("width", "100%")
                    self.resize()
                } else if (parent_map) {
                    //  возвращаем на место
                    var img = address.next()
                    console.log("address_next", address.next())

                    address.prependTo(parent_address).after(img)
                    parent_map.prepend(map_elem)
                    map_elem.css("width", width).css("height", height)
                    self.resize()
                    parent_map = parent_address = null
                }
            });
        },
        set_sel: function (name, value) {//   $.post()
            var $card = this.$card;
                x = $("[ name="+ name +" ]", $card );

            if (x.val() != value) {
                x.val( value )
                    .keyup().change();
            }
            this[ name ] = value;

            //  conjugate
            name += "_id";
            if (value) {
                $("[ name="+name+" ] :contains('"+ value +"')", $card ).attr("selected","selected")
                    .keyup().change();
            } else {
                $card.form("val", name, 0);
            }
        },
		to_address: function() {	// переходит на адрес указанный в адресе
			var self = this;

			this.geocoder.geocode({
				'address': this.address.val()
			}, function (results, status) {
				var location,
					//address,
					zoom;

				if (status == google.maps.GeocoderStatus.OK)	{
					location = results[ 0 ].geometry.location;
					zoom = 16

					address = self.address.val();
				} else {
					location = new google.maps.LatLng( 60.075803, 30.121765 );
					zoom = 8
					address = "Санкт-Петербург";
				}

				//  широта и долгота
				self.marker.setPosition(location)
				self.map.setCenter(location)
				self.map.setZoom(zoom)
				self.set_places(results && results[0]);
			});
		},
		//  устанавливает места находящиеся рядом с адресом
		set_places: function(place) {
			var city, district;

			if (!this.change) return;

			if (place) {
				$.each( place.address_components, function () {
					if (this.types[0] == "locality" ) {
						city = this.long_name
					}
					if (this.types[0] == "sublocality" ) {
						district = this.long_name
					}
				});
			}
			this.set_sel("city", city );
			this.set_sel("district", district );

			this.placeServiceSearch( place );
		},
        placeServiceSearch: function (place) {
            var service = new google.maps.places.PlacesService( this.map ),
                self = this;

            service.search({
                location: place ? place.geometry.location: this.map.getCenter(),
                radius: '500',
                types: ['subway_station']
            }, function (results, status) {
                var res = status == google.maps.places.PlacesServiceStatus.OK;

                self.set_sel("metro", res && results[0].name);
            });
        },
        //  строим карту - illegal ES5 name 'create'
        create: function() {
            var self = this,
                address = this.address,
                gmap = google.maps,
                location = new gmap.LatLng(60.075803, 30.121765),

                map = this.map = new gmap.Map( this.map_elem.get(0), {
                    zoom: 10,
                    center: location,
                    mapTypeId: gmap.MapTypeId.ROADMAP
                });

            console.log("address", address );

            //  ставим маркер на указанное место
            var marker = this.marker = new gmap.Marker({
                map: map,
                position: location
            });
            gmap.event.addListener( marker, 'click', function() {
                self.infoWindow = new gmap.InfoWindow({
                    map: map,
                    position: marker.getPosition(),
                    content: address.val()
                })
            });
		
            //  вешаем автодополнитель на адрес
            var autocomplete = new gmap.places.Autocomplete( address.get(0) );
            //  привязываем
            autocomplete.bindTo( 'bounds', map );
            //  ставим обработчик
            gmap.event.addListener( autocomplete, 'place_changed', function () {
                if (self.infoWindow) {
                    self.infoWindow.close();
                }
                //  warning on locals and self conflicting contexts
                self.placeOnAutocomplete(autocomplete, map, marker );
            });
		    return map;
		},
        placeOnAutocomplete: function (autocomplete, map, marker) {
            var place = autocomplete.getPlace(),
                location = place.geometry.viewport;

            if (!place) {
                console.log("google.maps.places.Autocomplete: not place");
            } else if (location) {
                map.fitBounds( location );
            } else {
                location = place.geometry.location;

                map.setCenter( location );
                marker.setPosition( location );
                map.setZoom(16);//  Why 17? Because it looks good.
            }
        },
        resize: function () {
            google.maps.event.trigger( this.map, 'resize' );
            this.map.setCenter( this.marker.getPosition() );
        },
		address_time: function () {
			this.to_address();
			setTimeout( app.plugin.realtyList.change_address, 0 );
		}
	});


    app.event.add("realtyList.city.load", "setMetroDistrict", function () {
        map.set_sel("metro", map.metro );
        map.set_sel("district", map.district );
    });

	function is_map() {
        return window.google && google.maps && google.maps.places && google.maps.places.PlacesService
    }

	app.event.add("create_maps", "create", function () {
		if (map) {
            map.address_time()
        } else if(is_map()) {
            map = new app.classes.GoogleMap()
            map.address_time()
        } else {
			var intervalObject = setInterval( function () {
				if(!is_map()) return;
				clearInterval(intervalObject)
				map = new app.classes.GoogleMap()
				console.log("map.address_time()")
				map.address_time()
			}, 500);
		}
	});
}());
