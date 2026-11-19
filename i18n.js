// Interface text for the site. Every visible string that is not a photo title,
// caption or object note lives here, in both languages.
// The photo and object translations live next to their English originals in
// gallery-data.js (`title_hr`, `caption_hr`) and objects.js (`title_hr`,
// `about_hr`, `facts_hr`).
window.I18N = {
  defaultLanguage: "en",
  languages: [
    { code: "en", label: "EN" },
    { code: "hr", label: "HR" }
  ],
  // A browser set to one of these gets Croatian on the first visit.
  detect: ["hr", "bs", "sr", "sl"],

  strings: {
    en: {
      title: "Backyard Deep Sky",
      subtitle: "Astro photos with a ZWO Seestar S50 Pro",
      intro1:
        "I photograph deep sky objects from my backyard in Donja Stubica, Croatia, " +
        "a small town in the Zagorje hills, about 30 km north of Zagreb. The " +
        "telescope is a smart scope that fits in a backpack: I put it on the ground, " +
        "pick a target in the phone app, and it finds and tracks the object on its own.",
      intro2:
        "Each picture is a stack of many short exposures, stretched and denoised in " +
        "the Seestar app, the watermark in the corner is added by the app itself, so " +
        "the object, time and integration travel with the file.",
      galleryHeading: "Gallery",
      place: "Donja Stubica, Croatia",
      map: "light pollution map ↗",
      empty: "No photos yet. Drop exports into masters/ and run scripts/build_gallery.py.",
      versions: function (n) { return n + " versions"; },
      exposures: "Exposures",
      hintZoom: "Click the image for full size and zoom",
      hintSwitch: "switch version above",
      aboutTitle: "About {name}",
      wiki: "Wikipedia ↗",
      more: "Open for details",
      footer:
        "Shot with a ZWO Seestar S50 Pro · stacked and processed in the Seestar app · " +
        "Donja Stubica, Croatia"
    },
    hr: {
      title: "Duboko nebo iz dvorišta",
      subtitle: "Astro fotografije sa ZWO Seestar S50 Pro",
      intro1:
        "Fotografiram objekte dubokog neba iz svog dvorišta u Donjoj Stubici, malom " +
        "mjestu u Hrvatskom zagorju, u podnožju Medvednice, tridesetak kilometara " +
        "sjeverno od Zagreba. Teleskop je smart scope koji stane u ruksak: stavim ga " +
        "na tlo, odaberem metu u aplikaciji na telefonu, a on sam pronađe i prati objekt.",
      intro2:
        "Svaka je snimka složena od mnogo kratkih ekspozicija, rastegnuta i očišćena " +
        "od šuma u aplikaciji Seestar. Vodeni žig u kutu dodaje sama aplikacija, pa uz " +
        "sliku uvijek idu objekt, vrijeme i trajanje integracije.",
      galleryHeading: "Galerija",
      place: "Donja Stubica, Hrvatska",
      map: "karta svjetlosnog onečišćenja ↗",
      empty: "Još nema slika. Ubaci izvoze u masters/ i pokreni scripts/build_gallery.py.",
      versions: function (n) {
        var tens = n % 100;
        if (tens >= 11 && tens <= 14) return n + " verzija";
        var unit = n % 10;
        if (unit === 1) return n + " verzija";
        if (unit >= 2 && unit <= 4) return n + " verzije";
        return n + " verzija";
      },
      exposures: "Ekspozicije",
      hintZoom: "Klikni sliku za punu veličinu i zumiranje",
      hintSwitch: "promijeni verziju gore",
      aboutTitle: "O objektu: {name}",
      wiki: "Wikipedija ↗",
      more: "Otvori za detalje",
      footer:
        "Snimljeno sa ZWO Seestar S50 Pro · složeno i obrađeno u aplikaciji Seestar · " +
        "Donja Stubica, Hrvatska"
    }
  },

  aria: {
    en: {
      lang: "Language",
      photos: "Photos",
      viewer: "Photo viewer",
      close: "Close",
      prev: "Previous photo",
      next: "Next photo",
      media: "Open full size and zoom",
      fullPhoto: "Full size photo",
      zoomIn: "Zoom in",
      zoomOut: "Zoom out",
      zoomReset: "Reset zoom",
      zoomClose: "Close full size photo",
      openDetails: "open details"
    },
    hr: {
      lang: "Jezik",
      photos: "Slike",
      viewer: "Pregled slike",
      close: "Zatvori",
      prev: "Prethodna slika",
      next: "Sljedeća slika",
      media: "Otvori punu veličinu i zumiranje",
      fullPhoto: "Slika pune veličine",
      zoomIn: "Povećaj",
      zoomOut: "Umanji",
      zoomReset: "Vrati zum",
      zoomClose: "Zatvori punu sliku",
      openDetails: "otvori detalje"
    }
  }
};
