# AccessMap web app with OpenTripPlanner

AccessMap, planning walking and transit trips with
[OpenTripPlanner](https://www.opentripplanner.org/) (OTP) over
[OpenSidewalks](https://github.com/OpenSidewalks/OpenSidewalks-Schema) (OSW) data. Trips are
planned for the traveller's profile: how steep they can go up and down, and whether they need curb
ramps. The directions describe each sidewalk, crossing and station pathway on the way.

It needs an OTP with the OpenSidewalks sandbox feature, from the `opensidewalks-with-osm` branch of
[PublicWorksOffice/OpenTripPlanner](https://github.com/PublicWorksOffice/OpenTripPlanner/tree/opensidewalks-with-osm).
OTP plans the trips, through its GTFS GraphQL API, and serves the map tiles of the sidewalks and
crossings. The base map and the search for places come from [MapTiler](https://www.maptiler.com/).

## Running OpenTripPlanner

You need Java 25 or newer and Maven.

1. Build OTP:

   ```bash
   git clone -b opensidewalks-with-osm https://github.com/PublicWorksOffice/OpenTripPlanner.git
   cd OpenTripPlanner
   mvn package -DskipTests
   ```

2. Make a directory for the data and configuration, and put in it:

   - An OSW dataset: its `edges.geojson` with its `nodes.geojson` beside it, or a zip of both.
     Its edges should have an `incline`, or every traveller is routed over every slope.
   - GTFS feeds, with `gtfs` in their file names, for example `kcm.gtfs.zip`. Feeds with
     `pathways.txt` and `levels.txt` give directions through stations.
   - The pedestrian cost profile, `ws-prod.json`, from
     `application/src/ext-test/resources/org/opentripplanner/ext/opensidewalks/` in OTP.

3. Add the configuration files to the same directory:

   ```json
   // otp-config.json
   {
     "otpFeatures": {
       "OpenSidewalks": true,
       "SandboxAPIMapboxVectorTilesApi": true
     }
   }
   ```

   ```json
   // build-config.json
   {
     "transitServiceStart": "-P1W",
     "transitServiceEnd": "P6M",
     "openSidewalks": {
       "sources": ["edges.geojson"],
       "profile": "ws-prod.json"
     }
   }
   ```

   ```json
   // router-config.json
   {
     "routingDefaults": {
       "walk": { "speed": 1.3 }
     },
     "vectorTiles": {
       "layers": [
         {
           "name": "transportation",
           "type": "OpenSidewalks",
           "mapper": "AccessMap",
           "minZoom": 13,
           "maxZoom": 20,
           "cacheMaxSeconds": 600
         }
       ]
     }
   }
   ```

4. Build the graph and start OTP on port 8080:

   ```bash
   java -Xmx10G -jar otp-shaded/target/otp-shaded-*.jar --build --save /path/to/directory
   java -Xmx6G -jar otp-shaded/target/otp-shaded-*.jar --load /path/to/directory
   ```

   Build the graph again whenever the data, `build-config.json` or OTP changes.

See `doc/user/sandbox/OpenSidewalks.md` in OTP for what the configuration does.

## Running the web app

1. Install the dependencies:

   ```bash
   npm install --legacy-peer-deps
   ```

   On Node 17 or newer `node-sass` does not build. Install without build scripts and use Dart Sass
   instead:

   ```bash
   npm install --legacy-peer-deps --ignore-scripts
   npm install --legacy-peer-deps --no-save sass@1.32.13
   rm -rf node_modules/node-sass
   ```

2. Copy `.env.sample` to `.env` and set `ROUTING_SERVER` to where OTP is, for example
   `http://localhost:8080`, with the `http://`. The other variables can be left empty.

3. Copy `config.json.example` to `config.json`, and set in it:

   - `maptilerKey`: a MapTiler API key. Restrict it to your domains: it is in the page.
   - `regions`: the regions the app offers, as GeoJSON features with a `MultiPolygon`, which can
     have several parts and holes, and the properties `id`, `key`, `name`, `bounds`, `lon`, `lat`
     and `zoom`. The first is the one the app starts in. With more than one, the app has a button
     to change region.

4. Start the development server on port 3000:

   ```bash
   npm start
   ```

   On Node 17 or newer, run `NODE_OPTIONS=--openssl-legacy-provider npm start`.

The development server sends `/api/v1/routing/*` to `ROUTING_SERVER`, so the app reaches OTP's
GraphQL API at `/api/v1/routing/otp/gtfs/v1` and its tiles at
`/api/v1/routing/otp/routers/default/vectorTiles/transportation/{z}/{x}/{y}.pbf`. A production
build (`npm run build`) does not do this: put it behind a web server that sends
`/api/v1/routing/` to OTP and leaves out that prefix, and that serves `config.json` at
`/config.json`. The app reads it when it starts, so the same build can be used anywhere.

## Sponsors / Supporters of Open Source

Continued development of AccessMap is sponsored by the Taskar Center for Accessible
Technology.

Hosting of AccessMap is sponsored by Microsoft Azure.

Cross-browser testing is supported by
[![BrowserStack](assets/logos/browserstack.png)](https://www.browserstack.com) (BrowserStack).
