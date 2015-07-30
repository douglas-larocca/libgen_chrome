Node = Node || {
  COMMENT_NODE: 8
};

function get_comments(elem) {
  var children = elem.childNodes;
  var links = [];

  for (var i=0, len=children.length; i<len; i++) {
    if (children[i].nodeType == Node.COMMENT_NODE) {
      var src = $(children[i]).find('span[source^="http://dlx"]').context.data;
      var link = /(http[^"]+)/g.exec(src);
      if (link) {
        links.push(link);
      }
    }
  }
  return links;
}

function is_book_page() {
  var el = $("#nav-subnav");
  var category = el.attr("data-category");
  return (el && (category == "books" || category == "digital-text"));
};

function get_book_title() {
  var title = $("#productTitle, #btAsinTitle")
    .text()
    .replace("[Kindle Edition]", "")
    .replace("[Paperback]", "")
    .replace("[Hardcover]", "");
  if (/:/g.exec(title) ) {
      title = title.split(':')[0]
  }
  return title;
}

function get_book_isbn() {
  return $('span:contains("ISBN")').eq(0).next().text().replace("-","").replace(/ /g,'');
}

function query_libgen(query) {
  var url = "http://gen.lib.rus.ec/search.php?open=0&view=simple&column=def&req=" + encodeURIComponent(query);
  var loader_image = chrome.extension.getURL("images/ajax-loader.gif");
  var loading = $("<div><center><img src='" + loader_image + "' /><h4>gen.lib.rus.ec search...</h4></center></div>");
  var nav_element = $("#mediaTabsGroup");
  if (!nav_element.length)
      nav_element = $("#MediaMatrix");
  nav_element.after(loading);

  var req = $.get(url);
  req.done(function(data) {
      var results = $("<div>").append(data).find(".c");
      if(results.find("tr").length == 1) { // only table header is received
        loading.html("<div style='background-color: #F0AD4E; padding: 5px'><center><h3>no results</h3></div>");
      } else {
        results.find("a").each(function() {
          if($(this).attr("href").indexOf("http://") != 0) {
            $(this).attr("href", "http://gen.lib.rus.ec/" + $(this).attr("href"));
          }
        });
        loading.html(results);
      }
    });

  req.always(function() {
    var isbn = get_book_isbn();
    query_libgen_isbn(isbn);
  });
}

function query_libgen_isbn(isbn) {
  var url = "http://gen.lib.rus.ec/search.php?req="+isbn+"&open=0&view=simple&phrase=1&column=identifier";
  var loading = $("<div />");
  var nav_element = $("#mediaTabsGroup");
  nav_element.after(loading);

  $.get(url).done(function(data) {      
      var bookzz_url = $('<div>').append(data).find('a[href^="http://bookzz.org/md5"]').eq(0).attr('href');
      if(!bookzz_url) {
        loading.html("<div style='background-color: #F0AD4E; padding: 5px'><center><h3>no isbn match</h3></div>");
      } else {
        $.get(bookzz_url).done(function(bookzz_data) {
            var url = $('<div>').append(bookzz_data).find('a.ddownload.color2.dnthandler').eq(0).attr('href');
            $.ajax({
                url: url,
                headers: {
                    'Content-Disposition': 'inline'
                }
            }).done(function(bookzz_dl) {
                 var pdf_url = $.map($('<div>').append(bookzz_dl).find('div'), get_comments)[0][0];
                 $('#productTitle.a-size-extra-large').replaceWith(function() {
                     var title = $.trim($(this).text());
                     return '<a href="' + pdf_url + '" id="productTitle" class="a-size-extra-large" target="_blank">' + title + '</a>';
                 });
            });
        });
      }
    });
}

(function main() {
  if(is_book_page()) {
    var title = get_book_title();
    query_libgen(title);
  }
})();
