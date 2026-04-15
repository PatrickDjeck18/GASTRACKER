import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState, useMemo } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { TOMTOM_API_KEY } from '../api/apiKey';
import { getLocalCurrencyCode } from '../services/fuelPriceService';
import type { Station } from '../types/station';

/* ── Public ref API ─────────────────────────────────── */
export interface TomTomMapRef {
  zoomIn: () => void;
  zoomOut: () => void;
}

interface Props {
  stations: Station[];
  allPrices: number[];
  fuelFilter: string | null;
  localCurrency?: string;
  onSelectStation: (id: string) => void;
  selectedStationId?: string | null;
  isDark: boolean;
  userCoords?: { latitude: number; longitude: number } | null;
  autoCenter?: boolean;
  onMapMoved?: () => void;
}

const TT_JS = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps-web.min.js';
const TT_CSS = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps.css';

export const TomTomMap = forwardRef<TomTomMapRef, Props>(function TomTomMapInner(
  { stations, allPrices, fuelFilter, localCurrency, onSelectStation, selectedStationId, isDark, userCoords, autoCenter = true, onMapMoved },
  ref,
) {
  const wvRef = useRef<WebView>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const pendingUpdate = useRef<any>(null);

  // Use local currency if provided, otherwise get from device
  const currency = localCurrency || getLocalCurrencyCode();

  useImperativeHandle(ref, () => ({
    zoomIn: () => wvRef.current?.injectJavaScript('if(window.mapZoomIn) window.mapZoomIn(); true;'),
    zoomOut: () => wvRef.current?.injectJavaScript('if(window.mapZoomOut) window.mapZoomOut(); true;'),
  }));

  /* ── initial HTML ──────────────────────────────────── */
  const bg = isDark ? '#070B14' : '#FFFFFF';
  const style = isDark ? 'basic_night' : 'basic_main';

  // Memoize HTML source to prevent reloading WebView abruptly on every stations/filter prop change
  const mapHtml = useMemo(() => {
    const initLat = userCoords?.latitude ?? 0;
    const initLon = userCoords?.longitude ?? 0;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
  <link rel="stylesheet" href="${TT_CSS}">
  <style>
    *{box-sizing:border-box}
    body{margin:0;padding:0;overflow:hidden;background:${bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
    #map{height:100vh;width:100vw;background:${bg}}
    .tt-marker{
      cursor:pointer;
      border-radius:20px;
      padding:5px 10px;
      color:#fff;
      font-weight:800;
      font-size:12px;
      box-shadow:0 2px 8px rgba(0,0,0,.3);
      white-space:nowrap;
      letter-spacing:-.3px;
      border:1.5px solid rgba(255,255,255,.3);
      user-select:none;
      transition:background-color .2s, box-shadow .2s;
      min-width:40px;
      text-align:center;
    }
    .tt-marker.selected{
      font-size: 14px!important;
      padding: 7px 12px!important;
      z-index:1000!important;
      box-shadow:0 0 0 3px rgba(255,255,255,.9),0 6px 20px rgba(0,0,0,.4)!important;
    }
    .udot-wrap{position:relative;display:flex;align-items:center;justify-content:center;width:28px;height:28px}
    @keyframes pr{0%{transform:scale(.8);opacity:.85}100%{transform:scale(2.6);opacity:0}}
    .udot-ring{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:20px;height:20px;border-radius:50%;background:rgba(59,130,246,.35);animation:pr 2s ease-out infinite}
    .udot{position:relative;z-index:1;width:16px;height:16px;border-radius:50%;background:#3B82F6;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(59,130,246,.6)}
  </style>
  <script src="${TT_JS}"></script>
</head>
<body>
<div id="map"></div>
<script>
  var map, markers=new Map(), userMark=null;
  var gStations=[], gFilter=null, gPrices=[], gSelId=null, gCurrency='${currency}';
  var mapLoaded=false;
  var pendingStationUpdate=null;

  function postMsg(data) {
    var msg = JSON.stringify(data);
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(msg);
    } else if (window.parent && window.parent.postMessage) {
      window.parent.postMessage(msg, '*');
    }
  }

  function log(msg) { postMsg({type:'log',message:msg}); }
  function postReady() { postMsg({type:'ready'}); }
  function postError(msg) { postMsg({type:'error',message:msg}); }

  function init(){
    if (typeof tt === 'undefined') {
      postError('TomTom SDK failed to load. Check internet connection.');
      return;
    }
    try{
      log('Initializing map at ' + ${initLat} + ',' + ${initLon});
      map=tt.map({
        key:'${TOMTOM_API_KEY}',
        container:'map',
        center:[${initLon},${initLat}],
        zoom:13,
        style:{map:'${style}'},
        fadeDuration:50
      });
      
      map.on('load',function(){
        log('Map loaded successfully');
        mapLoaded=true;
        // Apply any pending station data that arrived before the map was ready
        if(pendingStationUpdate){
          var d=pendingStationUpdate; pendingStationUpdate=null;
          gStations=d.stations||[]; gFilter=d.fuelFilter; gPrices=d.allPrices||[]; gSelId=d.selectedStationId;
          log('Applying pending update: ' + gStations.length + ' stations');
        }
        postReady();
        updateMarkers();
        updateUserDot(${initLat},${initLon});
      });

      map.on('click',function(){ postMsg({type:'mapClick'}); });
      map.on('dragstart',function(){ postMsg({type:'mapDrag'}); });
      
      map.on('error',function(e){
        log('Map error event: ' + (e.error ? e.error.message : JSON.stringify(e)));
        // Only post error if it seems fatal
        if(e.error && e.error.status === 403) postError('Invalid API Key or restricted access.');
      });
    }catch(e){
      log('Init exception: ' + e.message);
      postError(e.message);
    }
  }

  function sym(c){
    var m={EUR:'\u20ac',USD:'$',GBP:'\u00a3',ZAR:'R',BRL:'R$',CAD:'C$',AUD:'A$',CHF:'CHF ',PLN:'z\u0142',TRY:'\u20ba'};
    var code = (c||'USD').toUpperCase();
    return m[code] || (code+' ');
  }

  function tier(price,prices){
    if(!prices||prices.length===0||price===0)return'unknown';
    var mn=Math.min.apply(null,prices.filter(p=>p>0)), mx=Math.max.apply(null,prices.filter(p=>p>0)), r=mx-mn;
    if(r<=0)return'cheap';
    var ratio=(price-mn)/r;
    return ratio<0.33?'cheap':ratio<0.66?'fair':'poor';
  }
  function tierCol(t){return t==='cheap'?'#10b981':t==='fair'?'#f59e0b':t==='poor'?'#ef4444':'#64748b';}

  function updateMarkers(){
    if(!map)return;
    try {
      log('Updating ' + gStations.length + ' markers');
      var ids=new Set(gStations.filter(s=>s&&s.id).map(function(s){return s.id;}));
      
      // Remove old markers
      markers.forEach(function(m,id){
        if(!ids.has(id)){
          m.remove();
          markers.delete(id);
        }
      });

      // Add/Update markers
      gStations.forEach(function(s){
        if(!s || !s.coordinates) return;
        try {
          var fps=s.fuelPrices&&s.fuelPrices.length>0;
          var fp=fps?(gFilter?s.fuelPrices.find(function(p){return p.fuelType===gFilter;})||s.fuelPrices[0]:s.fuelPrices[0]):null;
          var price=fp?fp.price:0, cur=gCurrency||'USD';
          var tc=tierCol(tier(price,gPrices));
          var lbl=price>0?(sym(cur)+price.toFixed(2)):'⛽';
          var isSel=s.id===gSelId;
          
          var mk=markers.get(s.id);
          if(!mk){
            var el=document.createElement('div');
            el.className='tt-marker' + (isSel ? ' selected' : '');
            el.style.backgroundColor=tc;
            el.innerText=lbl;
            el.onclick=function(e){
              e.stopPropagation();
              postMsg({type:'select',id:s.id});
            };
            mk=new tt.Marker({element:el}).setLngLat([s.coordinates.longitude,s.coordinates.latitude]).addTo(map);
            markers.set(s.id,mk);
          } else {
            var mel=mk.getElement();
            if(mel) {
              // Convert hex/named color to rgb if needed or just blindly assign? 
              // Better: only assign if string is different to prevent reflow jumping.
              if (mel.innerText !== lbl) { mel.innerText = lbl; }
              // CSS applies tc directly, which might be rgb(...) when read back.
              // We'll just enforce the property directly. The engine optimizes it if identical.
              mel.style.backgroundColor = tc;
              isSel ? mel.classList.add('selected') : mel.classList.remove('selected');
            }
          }
        } catch(e) {
          log('Error for station ' + s.id + ': ' + e.message);
        }
      });
    } catch(e) {
      log('Error in updateMarkers: ' + e.message);
    }
  }

  function updateUserDot(lat,lon){
    if(!map || lat === 0)return;
    if(userMark){userMark.setLngLat([lon,lat]);return;}
    var wrap=document.createElement('div');wrap.className='udot-wrap';
    var ring=document.createElement('div');ring.className='udot-ring';
    var dot=document.createElement('div');dot.className='udot';
    wrap.appendChild(ring);wrap.appendChild(dot);
    userMark=new tt.Marker({element:wrap}).setLngLat([lon,lat]).addTo(map);
  }

  window.mapZoomIn =function(){if(map)map.zoomIn();};
  window.mapZoomOut=function(){if(map)map.zoomOut();};

  window.updateMap=function(d){
    if(!d) return;
    if(d.type==='center'){ if(map) map.panTo([d.lon,d.lat]); }
    else if(d.type==='update'){
      if(!mapLoaded){
        pendingStationUpdate=d;
        log('Map not loaded yet — queuing ' + (d.stations||[]).length + ' stations');
        return;
      }
      gStations=d.stations || [];
      gFilter=d.fuelFilter;
      gPrices=d.allPrices || [];
      gSelId=d.selectedStationId;
      gCurrency=d.localCurrency || gCurrency;
      updateMarkers();
    }
    else if(d.type==='userLoc'){ updateUserDot(d.lat,d.lon); }
  };

  window.pingReady=function(){
    if(mapLoaded) postReady();
  };

  if(typeof tt!=='undefined')init();else window.onload=init;
</script>
</body>
</html>`;
  }, [isDark, style, bg, currency]); // Re-render complete HTML only if theme changes

  /* ── inject station updates ───────────────────────── */
  useEffect(() => {
    const payload = { type: 'update', stations, fuelFilter, allPrices, selectedStationId, localCurrency: currency };
    if (!wvRef.current || !mapReady) {
      pendingUpdate.current = payload;
      return;
    }
    wvRef.current.injectJavaScript(`if(window.updateMap){window.updateMap(${JSON.stringify(payload)});}true;`);
  }, [mapReady, stations, fuelFilter, allPrices, selectedStationId, currency]);

  /* ── inject user-location updates ────────────────── */
  useEffect(() => {
    if (!wvRef.current || !userCoords || !mapReady) return;
    wvRef.current.injectJavaScript(
      `if(window.updateMap){window.updateMap({type:'userLoc',lat:${userCoords.latitude},lon:${userCoords.longitude}});}true;`,
    );
  }, [mapReady, userCoords?.latitude, userCoords?.longitude]);

  /* ── re-center when autoCenter flips back on ─────── */
  useEffect(() => {
    if (!wvRef.current || !userCoords || !autoCenter || !mapReady) return;
    wvRef.current.injectJavaScript(
      `if(window.updateMap){window.updateMap({type:'center',lat:${userCoords.latitude},lon:${userCoords.longitude}});}true;`,
    );
  }, [mapReady, autoCenter, userCoords?.latitude, userCoords?.longitude]);

  const onMessage = (evt: any) => {
    try {
      const msg = JSON.parse(evt.nativeEvent.data);
      if (msg.type === 'select') onSelectStation(msg.id);
      if (msg.type === 'mapClick') onSelectStation('');
      if (msg.type === 'mapDrag' && onMapMoved) onMapMoved();
      if (msg.type === 'error') {
        console.error('[TomTomMap] WebView error:', msg.message);
        setMapError(msg.message || 'Failed to load map');
        setMapReady(false);
      }
      if (msg.type === 'ready') {
        console.log('[TomTomMap] Map is ready');
        setMapError(null);
        setMapReady(true);
        if (pendingUpdate.current && wvRef.current) {
          wvRef.current.injectJavaScript(`if(window.updateMap){window.updateMap(${JSON.stringify(pendingUpdate.current)});}true;`);
          pendingUpdate.current = null;
        }
      }
      if (msg.type === 'log') {
        console.log('[TomTomMap] WebView:', msg.message);
      }
    } catch { }
  };

  return (
    <View style={s.root}>
      {mapError ? (
        <View style={s.errorContainer}>
          <Text style={s.errorText}>Map Error</Text>
          <Text style={s.errorDetail}>{mapError}</Text>
          <Text style={s.errorHint}>Check your internet connection and API key.</Text>
        </View>
      ) : !mapReady ? (
        <View style={[s.loadingContainer, { backgroundColor: bg }]}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={[s.loadingText, { color: isDark ? '#fff' : '#000' }]}>Loading interactive map...</Text>
        </View>
      ) : null}
      <WebView
        ref={wvRef}
        originWhitelist={['*']}
        mixedContentMode="always"
        source={{ html: mapHtml, baseUrl: Platform.OS === 'web' ? undefined : 'https://localhost' }}
        onMessage={onMessage}
        style={[s.map, mapError || !mapReady ? s.transparent : {}]}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        onLoadStart={() => setMapReady(false)}
        onLoadEnd={() => {
          // Safety net: if the map's 'ready' postMessage is somehow lost,
          // ping the WebView to call postReady() if mapLoaded is already true in JS.
          // If the map genuinely hasn't loaded, force mapReady so the loader hides
          // and users can at least see the map tiles (stations will inject when available).
          setTimeout(() => {
            if (wvRef.current) {
              wvRef.current.injectJavaScript(`if(typeof window.pingReady==='function'){window.pingReady();}true;`);
            }
          }, 3000);
          setTimeout(() => {
            // Last-resort: unhide the WebView even if map.on('load') never fired
            setMapReady((prev) => prev || true);
          }, 8000);
        }}
      />
    </View>
  );
});

const s = StyleSheet.create({
  root: { flex: 1 },
  map: { flex: 1, backgroundColor: 'transparent' },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 11, 20, 0.95)',
    padding: 30,
    zIndex: 10,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  errorDetail: {
    color: '#eee',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.8,
  },
  errorHint: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'center',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: '600',
    opacity: 0.8,
  },
  transparent: {
    opacity: 0,
  },
});

