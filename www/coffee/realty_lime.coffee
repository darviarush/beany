###
  # js2coffee translation of js/realty/list_methods.js
  #
  # todo escalate all glogals - e.g. check place
  #
###
realCard = app.exports.realty.realCard
#   not realty really
place = app.exports.place
weather_informer = app.exports.realty.weather_informer

##  terms
cached = {}

realtyListMethods = {
    ###
      @param {string} plugin_query -url адрес запроса к контроллеру
      @param {boolean} is_full -make content on response
    ###
    create_city: ($elem, plugin_query, is_full) ->
      ###
        serialize to html geo-properties
        @param {object} item -геоположение
      ###
      general = (item, has_count) ->
        tpl = "{$city}{$vicinity}{$region}{$country}"
        tokens =
          city: ((if item.city then item.city else ""))
          vicinity: ((if item.vicinity then " <u>" + item.vicinity + "</u>" else ""))
          region: ((if item.region then " <i>" + item.region + "</i>" else ""))
          country: " <b>" + item.country + "</b>"

        tokens.country += (" <em>" + item.count + "</em>")  if has_count

        tpl.replace("{$city}", tokens.city).replace("{$vicinity}", tokens.vicinity).replace("{$region}", tokens.region).replace "{$country}", tokens.country

      get_line =
        full: (item) ->
          general item, on

        shorty: (item) ->
          general item, off

      stuffLink = get_line[(if is_full then "full" else "short")]
      setLabelValue = (idx, item) ->
        value = item.city or item.vicinity or item.region or item.country

        item.label = item.value = value
        return
      traceConsole =
        focus: (event, ui) ->
          console.log "focus=" + repr(ui.item)

        search: (event, ui) ->
          console.log "search=" + repr(ui)

        change: (event, ui) ->
          console.log "change=" + repr(ui)

      onSourceCallback = (data, self, response) ->
         ul = self.menu.element
         exp = app.exports.metro

         response data
         ul.find('a').each (idx) ->
           item = data[idx]
           $(this).html stuffLink(item)  if item

         place = data[ 0 ]
         exp.autocompleteUpdate()  if exp and exp.hasOwnProperty('autocompleteUpdate')

      clearPlace = ->
        place = {}  if @value.replace(/^\s*/) is ''

      onSource = (data, response) ->
        self = this
        term = data.term
        xterm = cached[term]

        callback = (data) ->
          onSourceCallback data, self, response

          if xterm
            callback xterm
            return

          $.get plugin_query, {term: term}, (data) ->
            data = app.util.rowsToArrayOpt( data )
            $.each data, setLabelValue

            cached[ term ] = data
            callback data
          return

      ##  focus on NEXT - установить - на всех autocomplete
      $elem.autocomplete( $.extend( traceConsole,
        source: onSource
        select: (event, ui) ->
          place = ui.item
          $("#flt-from-dp").next().click()

          weather_informer.fire place
      )).keyup clearPlace
      return
    ###
      Подставляет адрес в заголовок диалога

      @param {boolean} is_init -предустанавливает обработчик
    ###
    change_address: (is_init) ->
      handler = (e) ->
        $("#realty").dialog "option", "title", $( this ).val()
        return;

      address = $("input[ name=address ]", realCard.$node )

      if is_init is true
        address.on 'change', handler
      else
        handler.call address
      return
	refreshArmoring: (data) ->
		app.event.run "armoring-refresh", data
		return
}

$.extend( app.plugin.realtyList, realtyListMethods ).call $("#plugin-realtyList")

#
#  protocol deprecated
#
(->
	###
		создаёт вкладку и инициализирует список в новой вкладке
	###
	init_tab_list = (th, id) ->
		idx = $panel.tabs("length")
		title = "Протокол"

		$panel.tabs "add", "#tab-" + id, title, idx
		th.appendTo "#tab-" + id
		$("#" + id + "-list").attr "id", "realty-list-" + idx

		return idx

	$prot = $("#plugin-protocol")
	$panel = app.exports.realty.tabs.$holder

	if $prot.length and cookies().sess
		index = init_tab_list($prot, "protocol")

	if index
		$("#realty-list-" + index).listCreate
			url: "/api/protocol/load"
			my: 2
			elem: $("#protocol-list-elem")
			paste: $.noop
			param:
				order: "id desc"

		app.exports.realty.tabs.bindAuthTab index
)()