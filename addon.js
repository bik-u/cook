const { addonBuilder } = require("stremio-addon-sdk");
require("dotenv").config();
const axios = require("axios");
const ani_url = "https://aniwatch.to/";
const kitsu_url = "https://kitsu.io/api/edge/anime/";
const media_url = "https://megacloud.tv/embed-2/ajax/e-1/getSources?id=";
const anilist_url = "https://graphql.anilist.co"
const crypto_js = require("crypto-js");

// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
const manifest = {
  id: "community.aniwatch",
  version: "0.0.1",
  catalogs: [{type: "anime", id: "ani_watch_to", name: "Aniwatch",
		"extra": [{name: "search", isRequired: true}]
	}],
  resources: ["stream", "meta"], 
  types: ["movie", "series", "channel", "tv"],
  name: "aniwatch",
  description: "Stream anime from aniwatch",
  idPrefixes: ["aniwatch"],
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

builder.defineMetaHandler(async(args) => {
  const res = await(await axios.get(`${ani_url}${args.id})`)).data
  //TODO: fix this mess by using a html scraper..
  const des_i = res.search(/Overview:/)
  let description = res.slice(des_i,
    des_i + res.slice(des_i, -1).search(/div>/))
    .split('\n').slice(2, -1).join('\n')
  const name = res.match(/data-jname=".+"/g)[0].split('"')[1]
  const query = `
    query($search: String) {
              Media (search: $search, type: ANIME) {
                  id
                  idMal
                  title {
                      english
                      romaji
                  }
                  bannerImage
                  coverImage {
                      medium
                      large
                      color
                  }
                  startDate {
                    year
                    month
                    day
                  }
                  endDate {
                    year
                    month
                    day
                  }
                  meanScore
                  averageScore
                  description
                  popularity
                  genres
              }
          }
  `
  const variables = {"search": name}
  let media = null
  let background = "https://steamuserimages-a.akamaihd.net/ugc/96103700532309699/8F44EE6DAFB4F4E2469AA4947059A09E1A78E93C/?imw=637&imh=358&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=true"
  let poster = ""
  let genres = []
  try {
    const res2 = await axios.post(anilist_url, body =  {query: query, variables: variables},
      headers={'Content-Type': 'application/json', 'Accept': 'application/json'})
      media = res2.data.data.Media
      background = media.bannerImage
      genres = media.genres
      poster = media.coverImage.medium
    } catch (error) {

    }
  let videos = []
  let id = args.id.split('-')
  id = id[id.length - 1].split('?')[0]
  await axios
    .get((url = `${ani_url}/ajax/v2/episode/list/${id}`))          
    .then(function (response) {                                         
      if (response.data.status) {                                       
        let titles = response.data.html.match(/title=".+>/g);           
        let ids = response.data.html.match(/data-id=("[0-9]+")/g);
        for (let i = 0; i < titles.length; i++) {
          try {                                                           
            videos.push({                                           
              title: titles[i].split('"')[1],                           
              id: `aniwatch:${ids[i].split('"')[1]}`,
              episode: i + 1,
              season: 1
            })                                                         
          } catch (error) {                                                
          }
        }                                                               
      }                                                                 
    });
                                                              
  meta = {
    id: args.id,
    type: args.type,
    name: name,
    description: description,
    background: background ,
    genres: genres,
    videos: videos,
    poster: poster,
  }
  return {meta}
})

builder.defineCatalogHandler(async(args) => {
	let metas = []
	if (args.extra && args.extra.search) {
        await axios
          .get((url = `${ani_url}ajax/search/suggest?keyword=${args.extra.search}`))
          .then(function (response) {
            if (response.data.status) {
              const matches = response.data.html.match(/(href.+")/g);
			        const pics = response.data.html.match(/(data-src=.+")/g)
              for (let i = 0; i < matches.length - 1; i++) {
                const arr = matches[i].split('"')[1];
                metas.push({
                  id: `aniwatch:${arr.slice(1, -1)}`,
                  type: 'series',
                  name: "".concat(arr.split("?")[0].split("-"), " "),
                  poster: pics[i].split('"')[1],
                });
              }                                                         		
            }                                                           		
          });
    	}
    return {metas}
})

builder.defineStreamHandler(async ({ type, id }) => {
  console.log("request for streams: " + type + " " + id);
  // Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/requests/defineStreamHandler.md
  let streams = []
  const arr = id.split(":");
  const ep_id = arr[arr.length - 1]
  const response = await axios.get(
    (url = `${ani_url}ajax/v2/episode/servers?episodeId=${ep_id}}`)
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
          title: `1080p ${m_type.toUpperCase()}`,
          url: vid_data[0].file,
          subtitles: subtitles,
		      behaviorHints : {
		        bingeGroup: `ani1080${m_type}`
		      }
        })
      } catch (error) {
      }
    }
  }

  return { streams };
});

module.exports = builder.getInterface();
