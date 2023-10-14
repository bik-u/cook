const { addonBuilder } = require("stremio-addon-sdk");
require("dotenv").config();
const axios = require("axios");
const ani_url = "https://aniwatch.to/";
const kitsu_url = "https://kitsu.io/api/edge/anime/";
const media_url = "https://megacloud.tv/embed-2/ajax/e-1/getSources?id=";
const crypto_js = require("crypto-js");

// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
const manifest = {
  id: "community.aniwatch",
  version: "0.0.1",
  catalogs: [],
  resources: ["stream"],
  types: ["movie", "series", "channel", "tv"],
  name: "aniwatch",
  description: "Stream anime from aniwatch",
  idPrefixes: ["kitsu"],
};
const builder = new addonBuilder(manifest);

async function decrypt(url) {
  const decryptKey = await (
    await axios.get(
      "https://raw.githubusercontent.com/enimax-anime/key/e6/key.txt"
    )
  ).data;
  let explodedURL = url.split("");
  let key = "";
  for (const range of decryptKey) {
    for (let i = range[0]; i < range[1]; i++) {
      key += explodedURL[i];
      explodedURL[i] = "";
    }
  }
  let final_url = explodedURL.join("");
  return JSON.parse(
    crypto_js.AES.decrypt(final_url, key).toString(crypto_js.enc.Utf8)
  );
}

builder.defineStreamHandler(async ({ type, id }) => {
  console.log("request for streams: " + type + " " + id);
  // Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/requests/defineStreamHandler.md
  const r = id.split(":");
  const num = parseInt(r[r.length - 1]) - 1;
  let title = null;
  streams = [];
  await axios
    .get((url = kitsu_url + r[1]), (headers = { accept: "application/json" }))
    .then(function (response) {
      let data = response.data.data;
      title = data.attributes.canonicalTitle;
    })
    .catch(function (error) {
      console.error(error);
    })
    .finally(function () {
      if (title) {
      }
    });
  if (!title) {
    return { streams };
  }
  let shows = [];
  await axios
    .get((url = `${ani_url}ajax/search/suggest?keyword=${title}`))
    .then(function (response) {
      if (response.data.status) {
        const matches = response.data.html.match(/(href.+")/g);
        for (let i = 0; i < matches.length - 1; i++) {
          const arr = matches[i].split('"')[1];
          const id = arr.split("-");
          const s = id.length - 1;
          if (id[s].length > 11) {
            shows.push({
              id: id[s].slice(0, -11),
              title: "".concat(arr.split("?")[0].split("-"), " "),
            });
          }
        }
      }
    });

  for (let i = 0; i < shows.length; i++) {
    let show = shows[i];
    let show_id = shows[i].id;
    await axios
      .get((url = `${ani_url}/ajax/v2/episode/list/${show_id}`))
      .then(function (response) {
        if (response.data.status) {
          let titles = response.data.html.match(/title=".+>/g);
          const ids = response.data.html.match(/data-id=("[0-9]+")/g);
          try {
            show["episode"] = {
              title: titles[num].split('"')[1],
              id: ids[num].split('"')[1],
            };
          } catch (erro) {
            show["episode"] = null;
          }
        }
      });
    if (!show.episode) {
      continue;
    }
    const response = await axios.get(
      (url = `${ani_url}ajax/v2/episode/servers?episodeId=${show.episode.id}}`)
    );
    let subtitles = null;

    if (response.data.status) {
      const matches = response.data.html.match(/data-type=.+"/g);
      let sub = false;
      let dub = false;
      for (let i = 0; i < matches.length; i++) {
        try {
          const match = matches[i];
          const arr = match.split('"');
          const srv_id = arr[arr.length - 2];
          const m_type = arr[1];
          if (m_type == "sub" && sub) {
            continue;
          } else if (m_type == "sub") {
            sub = true;
          }
          if (m_type == "dub" && dub) {
            continue;
          } else if (m_type == "dub") {
            dub = true;
          }
          const response2 = await axios.get(
            `${ani_url}ajax/v2/episode/sources?id=${srv_id}`
          );
          let src_id = response2.data.link.split("/");
          src_id = src_id[src_id.length - 1].split("?")[0];
          const response3 = await axios.get(`${media_url}${src_id}`);
          const vid_data = await decrypt(response3.data.sources);
          file = vid_data[0].file;
          if (!subtitles) {
            const tracks = response3.data.tracks;
            subtitles = [];
            for (let j = 0; j < tracks.length; j++) {
              let track = tracks[j];
              if (!track.kind == "captions") {
                continue;
              }
              subtitles.push({
                id: track.label,
                url: track.file,
                lang: track.label,
              });
            }
          }
          streams.push({
            title: `${show.episode.title} | ${m_type.toUpperCase()}`,
            url: vid_data[0].file,
            subtitles: subtitles,
          });
        } catch (error) {
          console.log(error);
        }
      }
    }
  }

  return { streams };
});

module.exports = builder.getInterface();
