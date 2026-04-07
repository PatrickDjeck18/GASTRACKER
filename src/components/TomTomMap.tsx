import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { TOMTOM_API_KEY } from '../api/apiKey';
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
  onSelectStation: (id: string) => void;
  selectedStationId?: string | null;
  isDark: boolean;
  userCoords?: { latitude: number; longitude: number } | null;
  autoCenter?: boolean;
}

const TT_JS  = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps-web.min.js';
const TT_CSS = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps.css';

export const TomTomMap = forwardRef<TomTomMapRef, Props>(function TomTomMapInner(
  { stations, allPrices, fuelFilter, onSelectStation, selectedStationId, isDark, userCoords, autoCenter = true },
  ref,
) {
  const wvRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    zoomIn:  () => wvRef.current?.injectJavaScript('if(window.mapZoomIn)  window.mapZoomIn();  true;'),
    zoomOut: () => wvRef.current?.injectJavaScript('if(window.mapZoomOut) window.mapZoomOut(); true;'),
  }));

  /* ── initial HTML ──────────────────────────────────── */
  const bg    = isDark ? '#070B14' : '#F0F4FF';
  const style = isDark ? 'basic_night' : 'basic_main';
  const initLat = userCoords?.latitude  ?? 0;
  const initLon = userCoords?.longitude ?? 0;

  const mapHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
  <link rel="stylesheet" href="${TT_CSS}">
  <style>
    *{box-sizing:border-box}
    body{margin:0;padding:0;overflow:hidden;background:${bg}}
    #map{height:100vh;width:100vw}
    .tt-marker{
      cursor:pointer;
      border-radius:20px;
      padding:5px 10px;
      color:#fff;
      font-weight:800;
      font-size:12px;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      box-shadow:0 2px 8px rgba(0,0,0,.3);
      white-space:nowrap;
      letter-spacing:-.3px;
      border:1.5px solid rgba(255,255,255,.3);
      user-select:none;
      transition:transform .2s cubic-bezier(.175,.885,.32,1.275),box-shadow .2s;
    }
    .tt-marker.selected{
      transform:scale(1.35)!important;
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

  function init(){
    try{
      map=tt.map({key:'${TOMTOM_API_KEY}',container:'map',center:[${initLon},${initLat}],zoom:13,style:{map:'${style}'},fadeDuration:50});
      map.on('load',function(){
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));
        updateMarkers();
        updateUserDot(${initLat},${initLon});
      });
      map.on('click',function(){
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'mapClick'}));
      });
    }catch(e){
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',message:e.message}));
    }
  }

  function sym(c){var m={EUR:'\u20ac',USD:'$',GBP:'\u00a3',ZAR:'R',BRL:'R$',CAD:'C$',AUD:'A$',CHF:'CHF ',PLN:'z\u0142',TRY:'\u20ba'};return m[(c||'').toUpperCase()]||(c+' ');}

  function tier(price,prices){
    if(!prices||prices.length===0||price===0)return'unknown';
    var mn=Math.min.apply(null,prices),mx=Math.max.apply(null,prices),r=mx-mn;
    if(r===0)return'cheap';
    var ratio=(price-mn)/r;
    return ratio<0.33?'cheap':ratio<0.66?'fair':'poor';
  }
  function tierCol(t){return t==='cheap'?'#10b981':t==='fair'?'#f59e0b':t==='poor'?'#ef4444':'#64748b';}

  var gStations=${JSON.stringify(stations)};
  var gFilter=${JSON.stringify(fuelFilter)};
  var gPrices=${JSON.stringify(allPrices)};
  var gSelId=${JSON.stringify(selectedStationId)};

  function updateMarkers(){
    if(!map)return;
    var ids=new Set(gStations.map(function(s){return s.id;}));
    markers.forEach(function(m,id){if(!ids.has(id)){m.remove();markers.delete(id);}});
    gStations.forEach(function(s){
      var fps=s.fuelPrices&&s.fuelPrices.length>0;
      var fp=fps?(gFilter?s.fuelPrices.find(function(p){return p.fuelType===gFilter;})||s.fuelPrices[0]:s.fuelPrices[0]):null;
      var price=fp?fp.price:0,cur=fp?fp.currency:'USD';
      var tc=tierCol(tier(price,gPrices));
      var lbl=price>0?(sym(cur)+price.toFixed(2)):'⛽';
      var isSel=s.id===gSelId;
      var mk=markers.get(s.id);
      if(!mk){
        var el=document.createElement('div');
        el.className='tt-marker';
        el.style.backgroundColor=tc;
        el.innerText=lbl;
        el.onclick=function(e){e.stopPropagation();window.ReactNativeWebView.postMessage(JSON.stringify({type:'select',id:s.id}));};
        mk=new tt.Marker({element:el}).setLngLat([s.coordinates.longitude,s.coordinates.latitude]).addTo(map);
        markers.set(s.id,mk);
      }
      var mel=mk.getElement();
      mel.style.backgroundColor=tc;
      mel.innerText=lbl;
      isSel?mel.classList.add('selected'):mel.classList.remove('selected');
    });
  }

  function updateUserDot(lat,lon){
    if(!map)return;
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
    if(d.type==='center'){map.panTo([d.lon,d.lat]);}
    else if(d.type==='update'){gStations=d.stations;gFilter=d.fuelFilter;gPrices=d.allPrices;gSelId=d.selectedStationId;updateMarkers();}
    else if(d.type==='userLoc'){updateUserDot(d.lat,d.lon);}
  };

  if(typeof tt!=='undefined')init();else window.onload=init;
</script>
</body>
</html>`;

  /* ── inject station updates ───────────────────────── */
  useEffect(() => {
    if (!wvRef.current) return;
    const payload = JSON.stringify({ type: 'update', stations, fuelFilter, allPrices, selectedStationId });
    wvRef.current.injectJavaScript(`if(window.updateMap){window.updateMap(${payload});}true;`);
  }, [stations, fuelFilter, allPrices, selectedStationId]);

  /* ── inject user-location updates ────────────────── */
  useEffect(() => {
    if (!wvRef.current || !userCoords) return;
    wvRef.current.injectJavaScript(
      `if(window.updateMap){window.updateMap({type:'userLoc',lat:${userCoords.latitude},lon:${userCoords.longitude}});}true;`,
    );
  }, [userCoords?.latitude, userCoords?.longitude]);

  /* ── re-center when autoCenter flips back on ─────── */
  useEffect(() => {
    if (!wvRef.current || !userCoords || !autoCenter) return;
    wvRef.current.injectJavaScript(
      `if(window.updateMap){window.updateMap({type:'center',lat:${userCoords.latitude},lon:${userCoords.longitude}});}true;`,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCenter]);

  const onMessage = (evt: any) => {
    try {
      const msg = JSON.parse(evt.nativeEvent.data);
      if (msg.type === 'select')   onSelectStation(msg.id);
      if (msg.type === 'mapClick') onSelectStation('');
    } catch {}
  };

  return (
    <View style={s.root}>
      <WebView
        ref={wvRef}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        onMessage={onMessage}
        style={s.map}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
});

const s = StyleSheet.create({
  root: { flex: 1 },
  map:  { flex: 1, backgroundColor: 'transparent' },
});
