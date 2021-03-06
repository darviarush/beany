// Generated by CoffeeScript 1.4.0

/*
  # js2coffee translation of old realtyList/list_item_methods.js
  #
  # todo escalate all glogals - e.g. check place
  #
*/


(function() {
  var cached, place, realCard, realtyListMethods, weather_informer;

  realCard = app.exports.realty.realCard;

  place = app.exports.place;

  weather_informer = app.exports.realty.weather_informer;

  cached = {};

  realtyListMethods = {
    /*
          @param {string} plugin_query -url адрес запроса к контроллеру
          @param {boolean} is_full -make content on response
    */

    create_city: function($elem, plugin_query, is_full) {
      /*
              serialize to html geo-properties
              @param {object} item -геоположение
      */

      var clearPlace, general, get_line, onSource, onSourceCallback, setLabelValue, stuffLink, traceConsole;
      general = function(item, has_count) {
        var tokens, tpl;
        tpl = "{$city}{$vicinity}{$region}{$country}";
        tokens = {
          city: (item.city ? item.city : ""),
          vicinity: (item.vicinity ? " <u>" + item.vicinity + "</u>" : ""),
          region: (item.region ? " <i>" + item.region + "</i>" : ""),
          country: " <b>" + item.country + "</b>"
        };
        if (has_count) {
          tokens.country += " <em>" + item.count + "</em>";
        }
        return tpl.replace("{$city}", tokens.city).replace("{$vicinity}", tokens.vicinity).replace("{$region}", tokens.region).replace("{$country}", tokens.country);
      };
      get_line = {
        full: function(item) {
          return general(item, true);
        },
        shorty: function(item) {
          return general(item, false);
        }
      };
      stuffLink = get_line[(is_full ? "full" : "short")];
      setLabelValue = function(idx, item) {
        var value;
        value = item.city || item.vicinity || item.region || item.country;
        item.label = item.value = value;
      };
      traceConsole = {
        focus: function(event, ui) {
          return console.log("focus=" + repr(ui.item));
        },
        search: function(event, ui) {
          return console.log("search=" + repr(ui));
        },
        change: function(event, ui) {
          return console.log("change=" + repr(ui));
        }
      };
      onSourceCallback = function(data, self, response) {
        var exp, ul;
        ul = self.menu.element;
        exp = app.exports.metro;
        response(data);
        ul.find('a').each(function(idx) {
          var item;
          item = data[idx];
          if (item) {
            return $(this).html(stuffLink(item));
          }
        });
        place = data[0];
        if (exp && exp.hasOwnProperty('autocompleteUpdate')) {
          return exp.autocompleteUpdate();
        }
      };
      clearPlace = function() {
        if (this.value.replace(/^\s*/) === '') {
          return place = {};
        }
      };
      onSource = function(data, response) {
        var callback, self, term, xterm;
        self = this;
        term = data.term;
        xterm = cached[term];
        return callback = function(data) {
          onSourceCallback(data, self, response);
          if (xterm) {
            callback(xterm);
            return;
          }
          $.get(plugin_query, {
            term: term
          }, function(data) {
            data = app.util.rowsToArrayOpt(data);
            $.each(data, setLabelValue);
            cached[term] = data;
            return callback(data);
          });
        };
      };
      $elem.autocomplete($.extend(traceConsole, {
        source: onSource,
        select: function(event, ui) {
          place = ui.item;
          $("#flt-from-dp").next().click();
          return weather_informer.fire(place);
        }
      })).keyup(clearPlace);
    },
    /*
          Подставляет адрес в заголовок диалога
    
          @param {boolean} is_init -предустанавливает обработчик
    */

    change_address: function(is_init) {
      var address, handler;
      handler = function(e) {
        $("#realty").dialog("option", "title", $(this).val());
      };
      address = $("input[ name=address ]", realCard.$node);
      if (is_init === true) {
        address.on('change', handler);
      } else {
        handler.call(address);
      }
    },
    refreshArmoring: function(data) {
      app.event.run("armoring-refresh", data);
    }
  };

  $.extend(app.plugin.realtyList, realtyListMethods).call($("#plugin-realtyList"));

  (function() {
    /*
    		создаёт вкладку и инициализирует список в новой вкладке
    */

    var $panel, $prot, index, init_tab_list;
    init_tab_list = function(th, id) {
      var idx, title;
      idx = $panel.tabs("length");
      title = "Протокол";
      $panel.tabs("add", "#tab-" + id, title, idx);
      th.appendTo("#tab-" + id);
      $("#" + id + "-list").attr("id", "realty-list-" + idx);
      return idx;
    };
    $prot = $("#plugin-protocol");
    $panel = app.exports.realty.tabs.$holder;
    if ($prot.length && cookies().sess) {
      index = init_tab_list($prot, "protocol");
    }
    if (index) {
      $("#realty-list-" + index).listCreate({
        url: "/api/protocol/load",
        my: 2,
        elem: $("#protocol-list-elem"),
        paste: $.noop,
        param: {
          order: "id desc"
        }
      });
      return app.exports.realty.tabs.bindAuthTab(index);
    }
  })();

}).call(this);
