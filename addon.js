const { addonBuilder } = require("stremio-addon-sdk")
require("dotenv").config()
const axios  = require("axios")
const ani_url = "https://aniwatch.to/"
const kitsu_url = "https://kitsu.io/api/edge/anime/"
const pink_url = "https://pinkish-hue.vercel.app/"

console.log(process.env.TMDB_KEY)
// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
const manifest = {
	"id": "community.aniwatch",
	"version": "0.0.1",
	"catalogs": [],
	"resources": [
		"stream"
	],
	"types": [
		"movie",
		"series",
		"channel",
		"tv"
	],
	"name": "aniwatch",
	"description": "Stream anime from aniwatch",
	"idPrefixes": ['kitsu']
}
const builder = new addonBuilder(manifest)

function check_m_type(m_type, sub_count, dub_count) {
	if (m_type == "sub") {
		if (sub_count > 0) {
			if (dub_count > 0) {
				return false
			}
			return false
		}
	} else if (m_type == "dub") {
		if (dub_count > 0) {
			if (sub_count > 0) {
				return false
			}
			return false
		}
	}
	return true
}

async function decrypt() {
	const decrypt = await (
      await axios.get("https://github.com/enimax-anime/key/blob/e6/key.txt")
    ).data;

    const blobString = '"blob-code blob-code-inner js-file-line">';
    const afterIndex = decrypt.indexOf(
      '"blob-code blob-code-inner js-file-line">'
    );
    const newblobString =
      afterIndex == -1 ? "" : decrypt.substring(afterIndex + blobString.length);
    const beforeIndex = newblobString.indexOf("</td>");
    let decryptKey =
      beforeIndex == -1 ? "" : newblobString.substring(0, beforeIndex);
	console.log(decryptKey)
}

builder.defineStreamHandler(async({type, id}) => {
	console.log("request for streams: "+type+" "+id)
	// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/requests/defineStreamHandler.md
	const r = id.split(':')
	const num = parseInt(r[r.length - 1])
	let title = null
	streams = []
	await axios.get(url=kitsu_url + r[1],
		headers={accept: 'application/json'})
		.then(function(response) {
			let data = response.data.data
			title = data.attributes.canonicalTitle
		})
		.catch(function (error) {
			console.error(error)
		})
		.finally(function () {
			if (title) {
			}
		})
	if (!title) {
		return {streams}
	}
	let shows = []
	await axios.get(url=`${ani_url}ajax/search/suggest?keyword=${title}`)
		.then(function(response) {
			if (response.data.status) {
				const matches = response.data.html.match(/(href.+")/g)
				for (let i = 0; i < matches.length - 1; i++) {
					const arr = matches[i].split('"')[1]
					const id = arr.split('-') 
					const s = id.length - 1 
					if (id[s].length > 11) {
						shows.push({
							id: id[s].slice(0, -11),
							title: arr.split('?')[0]
						})
					}
				}

			}
		})
	for (let i = 0; i < shows.length; i++) {
		let show = shows[i]
		let show_id = shows[i].id
		await axios.get(url=`${ani_url}/ajax/v2/episode/list/${show_id}`)
			.then(function(response) {
				if (response.data.status) {
					let titles = response.data.html.match(/title=".+/g)
					const ids = response.data.html.match(/data-id=("[0-9]+")/g)
					try {
						show["episode"] = {
							title: titles[num].split('"')[1],
							id: ids[num].split('"')[1]
						}
					} catch (erro) {
						show["episode"] = null
					}
				}
			})
		if (!show.episode) {
			continue
		}
		await axios.get(url=`${pink_url}watch${show.title}?ep=${show.episode.id}`)
			.then(function(response) {
				let data = response.data[0]
				for (let j = 0; j < data.sources.length; j++) {
					let src = data.sources[j]
					streams.push({
						title: `${show.episode.title} ${src.quality}`,
						url: src.url
					})
				}
			})
	}

	await decrypt()
	return {streams}
})

module.exports = builder.getInterface()