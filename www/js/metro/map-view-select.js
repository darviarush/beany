/**
 *
 * selectStation
 *
 *  -block
 *  -edit
 *      -=block
 *      -=action
 *      -=button
 *      -=control
 *  -name
 *
 * @type {Function}
 */
(function () {

    /**
     * Список странций метрополитена - block
     *
     * @type {Object}
     */
    var block = {
        //  for future - false если, например, будут
        //      показываться дополнительные сведения в блоке по месту
        edit: true,
        /**
         * Обновить представление
         *
         * @param {boolean} before
         */
        updateView: function (before) {
            //  is queried by dom replacements
            this.$holder = $('.metro-stations');
            this.$items = $('.metro-station', this.$holder );

            this.$holder[ before ? 'unbind' : 'bind' ]( 'change', this.onChange );
        },
        //  no proxy
        onChange: function () {
            var value = $( this ).val();

            block.onChangeRun( value );
        },
        /**
         *
         *
         * @param {array} list
         * @param {boolean} is_admin
         * @param {function} callback - editBlock.init with required
         */
        load: function (list, is_admin, callback ) {
            this.list = list;
            this.list_max = list.length;
            this.edit = is_admin;

            this.updateView(true);
            this.$holder
                .replaceWith( this.createView() );

            this.updateView(false);

            if (is_admin) {
                callback()
            }
        },
        list: [],
        /**
         * Создать представление
         *  @value -хранится индекс
         *
         * @return {object} dom fragment
         */
        createView: function () {
            var i = 0,
                item,
                $item = $( this.$items[0] ).clone(),
                $temp = this.$holder.clone()
                    .empty().append( $item );

            for (; i < this.list_max; i += 1) {
                item = $item.clone()
                    .text( this.list[ i ].name )
                    .attr( 'value', i );

                $temp.append( item );
            }
            return $temp;
        },
        //  add callbacks
        //  extends to reposition and naming..
        //
        callbacks: [],
        onChangeRun: function (value) {
            var list = this.callbacks,
                len = list.length;

            for (; len-- ;) {
                list[ len ](value);
            }
        }
    };



    var editBlock = {
        $info: $( '.metro-data-edit__info' ).text(''),
        $controls: {
            holder: $( '.metro-data-edit__controls' )
        },
        /**
         *
         * @param {object} required -  implementations
         */
        init: function (required) {
            if (required) {
                this.initControls();

                this.nav = required.nav;
                this.proxyIcon = required.station;
            }
        },
        initControls: function () {
            var holder = this.$controls.holder;

            this.$controls = $.extend( this.$controls, {
                name: $( '.metro-data-edit__item-name', holder ),
                icon: $( '.metro-data-edit__item-icon', holder ),
                //
                //  todo add rename|erase
                //
                action: $( '.metro-data-edit__item-action', holder )
            });
            this.$controls
                .action.on( 'click', $.proxy( this.updateAction, this) )
                .button();
        },
        //
        //  todo@states
        //
        updateAction: function () {
            var $ctx = this.$controls.action,
                state = this.state;

            this.map2Image();

            if (state === '') {
                //initial
                $ctx.text('please select');
            } else if (state === 'delete') {
                $ctx.text('get deleted!');
            } else if (state === 'save') {
                $ctx.text('get saved!');
                this.$controls.icon.html('')
            }
        },
        state: '',
        /**
         *
         *
         */
        current: {
            item: null,
            position: null            
        },
        onDragStop: function (idx, pos) {
            var test = this.nav.testImageOffset( pos );

            this.current.position = pos;
            this.current.item = block.list[ idx ];

            if (test) {
                this.updateControlState({
                    state: 'save',
                    label: 'Поместить'
                });
            } else {
                this.updateControlState();
            }
        },
        /**
         *  event handler
         *
         * @param item_id
         */
        updateByBlock: function (idx) {
            var item = idx >= 0 ? block.list[ idx ] : '';

            if (item && typeof item === "object") {
                //  todo resolve state
                this.useControl( item, idx );
            } else {
                this.state = '';

                console.log( 'bad on='+ idx +' val='+ item );
            }
        },
        /**
         *
         * @param {number} idx - ловим индекс в замыкание
         *
         * @return {object} dom draggable element
         */
        addStationIcon: function (idx) {
            var self = this,
                options_drag = {
                    containment: '.metro-map-container',
                    stop: function () {
                        self.onDragStop( idx, $( this ).position() );
                    }
                };

            return $( this.proxyIcon
                .getFilled( block.list_max, block.list[ idx ], '__admin-tool' )
            ).draggable( options_drag );
        },
        useControl: function (item, idx) {
            var has_coords = item.x && item.y,
                $icon;

            if (has_coords) {
                this.updateControlState({
                    state: 'delete',
                    label: 'Удалить'
                });
                this.$controls.icon.html( '' );
            } else {
                $icon = this.addStationIcon( idx, has_coords );
                this.$controls.icon.html( $icon );

                this.updateControlState();
            }
            this.$controls.name.text( '' );//item.name
        },
        //
        //  @param {objectt} o - {state, label}
        //
        updateControlState: function (o) {
            var state = o && o.state ? o.state : 'add',
                label = o && o.label ? o.label : 'Добавить на схему';

            this.state = state;
            this.$controls.action.text( label );

            if (state === 'delete') {
                //todo update caption..
                this.$controls.icon.html( '' );
            } else if (state === 'save') {
                //todo delete icon after click
            }
        },
        /**
         * on map methods - todo separate
         *
         */
        map2Delete: function () {
            var off_idx = $('.metro-stations option' )
                .filter(':selected' ).val();

            if (off_idx >= 0) {
                this.nav.deleteItem( off_idx );
            }
        },
        map2Image: function () {
            var start = this.nav.start_offset,
                off = this.nav.$image.offset(),
                delta = {
                    left: off.left - start.left,
                    top: off.top - start.top
                },
                pos, save;

            if (this.state == 'save' || this.state == 'add') {
                pos = this.current.position;

                //  save-is-not-add
                if (pos) {
                    save = {
                        x: pos.left - delta.left,
                        y: pos.top - delta.top
                    };
                    this.nav.storeItem( this.current.item, save );
                }
                //console.log('@L'+ pos.left +'\t@T'+ pos.top );
            } else if (this.state == 'delete') {
                this.map2Delete();
            } else {
                //nothing todo
            }
        }
    };
    /**
     *  component binds
     */
    //function blockOnChange() {
    block.callbacks.push( function (value) {
        editBlock.updateByBlock( value );
    });


    /**
     * test init - with auto complete 50748/27505
     *
     */
    app.exports.metro['populateStationNames'] = function (list, required ) {
        var is_admin = metros.rights.admin;

        block.load( list, is_admin, function () {
            editBlock.init( required );
        });
    };
}());