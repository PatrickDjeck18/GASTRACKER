import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown, FadeIn, SlideInUp } from 'react-native-reanimated';

import { TOMTOM_API_KEY } from '../api/apiKey';
import { Colors, Spacing, Radii, FontSize, Shadows } from '../constants/theme';
import { useLocation } from '../hooks/useLocation';
import { useRouteInfo } from '../hooks/useRouteInfo';
import { formatTravelTime, formatRouteDistance } from '../api/routing';

export type InAppNavigationParams = {
  InAppNavigation: {
    destLat: number;
    destLon: number;
    stationName: string;
  };
};

const TT_JS = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps-web.min.js';
const TT_CSS = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps.css';

export default function InAppNavigationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<InAppNavigationParams, 'InAppNavigation'>>();
  const { destLat, destLon, stationName } = route.params;

  const { coords } = useLocation();
  const wvRef = useRef<WebView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('Head toward your destination');
  const [stepIcon, setStepIcon] = useState<string>('navigation');

  const originLat = coords?.latitude ?? 0;
  const originLon = coords?.longitude ?? 0;

  /* ── Route info for ETA/distance ─── */
  const { data: routeInfo, isLoading: routeLoading } = useRouteInfo({
    originLat,
    originLon,
    destLat,
    destLon,
    enabled: !!coords,
  });

  /* ── Build WebView HTML ─── */
  const navHtml = useMemo(() => {
    const bg = '#0A0A0F';
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
  <link rel="stylesheet" href="${TT_CSS}">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:${bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;overflow:hidden}
    #map{height:100vh;width:100vw;background:${bg}}
    .udot-wrap{position:relative;display:flex;align-items:center;justify-content:center;width:32px;height:32px}
    @keyframes pr{0%{transform:scale(.8);opacity:.85}100%{transform:scale(2.8);opacity:0}}
    .udot-ring{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:24px;height:24px;border-radius:50%;background:rgba(249,115,22,.35);animation:pr 2s ease-out infinite}
    .udot{position:relative;z-index:1;width:18px;height:18px;border-radius:50%;background:#F97316;border:3px solid #fff;box-shadow:0 2px 10px rgba(249,115,22,.7)}
    .dest-marker{display:flex;align-items:center;justify-content:center;flex-direction:column;cursor:pointer}
    .dest-pin{width:44px;height:44px;border-radius:50%;background:#F97316;border:3.5px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(249,115,22,.5)}
    .dest-pin-inner{width:14px;height:14px;border-radius:50%;background:#fff}
    .dest-label{margin-top:4px;background:rgba(0,0,0,0.7);color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:8px;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis}
  </style>
  <script src="${TT_JS}"></script>
</head>
<body>
<div id="map"></div>
<script>
  var map, userMark=null, destMark=null, routeLayer=null;
  var mapLoaded=false;
  var gOriginLat=${originLat}, gOriginLon=${originLon};
  var gDestLat=${destLat}, gDestLon=${destLon};
  var gStationName=${JSON.stringify(stationName)};
  var API_KEY='${TOMTOM_API_KEY}';

  function postMsg(data){ if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify(data)); } }
  function log(m){ postMsg({type:'log',message:m}); }

  function init(){
    if(typeof tt==='undefined'){ postMsg({type:'error',message:'TomTom SDK failed to load'}); return; }
    try{
      map=tt.map({
        key:API_KEY,
        container:'map',
        center:[gOriginLon,gOriginLat],
        zoom:14,
        style:{map:'basic_night'},
        fadeDuration:50
      });
      map.on('load',function(){
        mapLoaded=true;
        log('Nav map loaded');
        addUserDot(gOriginLat,gOriginLon);
        addDestMarker(gDestLat,gDestLon);
        fetchAndDrawRoute();
        postMsg({type:'ready'});
      });
      map.on('error',function(e){ log('Map err: '+(e.error?e.error.message:'')); });
    }catch(e){ postMsg({type:'error',message:e.message}); }
  }

  function addUserDot(lat,lon){
    if(userMark){ userMark.setLngLat([lon,lat]); return; }
    var wrap=document.createElement('div'); wrap.className='udot-wrap';
    var ring=document.createElement('div'); ring.className='udot-ring';
    var dot=document.createElement('div');  dot.className='udot';
    wrap.appendChild(ring); wrap.appendChild(dot);
    userMark=new tt.Marker({element:wrap}).setLngLat([lon,lat]).addTo(map);
  }

  function addDestMarker(lat,lon){
    var wrap=document.createElement('div'); wrap.className='dest-marker';
    var pin=document.createElement('div');  pin.className='dest-pin';
    var inner=document.createElement('div');inner.className='dest-pin-inner';
    pin.appendChild(inner);
    var lbl=document.createElement('div'); lbl.className='dest-label'; lbl.textContent=gStationName;
    wrap.appendChild(pin); wrap.appendChild(lbl);
    destMark=new tt.Marker({element:wrap,anchor:'bottom'}).setLngLat([lon,lat]).addTo(map);
  }

  function fetchAndDrawRoute(){
    var url='https://api.tomtom.com/routing/1/calculateRoute/'+
      gOriginLat+','+gOriginLon+':'+gDestLat+','+gDestLon+'/json'+
      '?key='+API_KEY+'&travelMode=car&traffic=true&routeType=fastest&instructionsType=text&language=en-GB&sectionType=traffic';
    fetch(url)
      .then(function(r){ return r.json(); })
      .then(function(data){
        var route=data.routes&&data.routes[0];
        if(!route){ log('No route found'); return; }
        var coords=[];
        (route.legs||[]).forEach(function(leg){
          (leg.points||[]).forEach(function(p){ coords.push([p.longitude,p.latitude]); });
        });
        if(map.getSource('route')){ map.getSource('route').setData({type:'Feature',geometry:{type:'LineString',coordinates:coords}}); }
        else {
          map.addSource('route',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:coords}}});
          map.addLayer({
            id:'route-line',type:'line',source:'route',
            layout:{'line-join':'round','line-cap':'round'},
            paint:{'line-color':'#F97316','line-width':6,'line-opacity':0.9}
          });
          map.addLayer({
            id:'route-line-border',type:'line',source:'route',
            layout:{'line-join':'round','line-cap':'round'},
            paint:{'line-color':'#EA580C','line-width':10,'line-opacity':0.25}
          },'route-line');
        }
        /* Fit bounds to the route */
        if(coords.length>0){
          var bounds=coords.reduce(function(b,c){ return b.extend(c); }, new tt.LngLatBounds(coords[0],coords[0]));
          map.fitBounds(bounds,{padding:{top:80,bottom:120,left:40,right:40},duration:1200});
        }
        /* Post first instruction */
        var instr=route.guidance&&route.guidance.instructions;
        if(instr&&instr.length>0){
          var first=instr[0];
          postMsg({type:'instruction',message:first.message||'Follow the route',maneuver:first.maneuver||'STRAIGHT'});
        }
        /* Post route summary */
        var sum=route.summary;
        if(sum){ postMsg({type:'routeSummary',travelTime:sum.travelTimeInSeconds,distance:sum.lengthInMeters,delay:sum.trafficDelayInSeconds}); }
        postMsg({type:'routeReady'});
      })
      .catch(function(e){ log('Route error: '+e.message); });
  }

  window.updateUserLocation=function(lat,lon){
    gOriginLat=lat; gOriginLon=lon;
    if(mapLoaded) addUserDot(lat,lon);
  };

  window.pingReady=function(){ if(mapLoaded) postMsg({type:'ready'}); };

  if(typeof tt!=='undefined') init(); else window.onload=init;
</script>
</body>
</html>`;
  }, [originLat, originLon, destLat, destLon, stationName]);

  /* ── Push live location into WebView ─── */
  useEffect(() => {
    if (!wvRef.current || !coords || !mapReady) return;
    wvRef.current.injectJavaScript(
      `if(window.updateUserLocation){window.updateUserLocation(${coords.latitude},${coords.longitude});}true;`
    );
  }, [coords?.latitude, coords?.longitude, mapReady]);

  const onMessage = useCallback((evt: any) => {
    try {
      const msg = JSON.parse(evt.nativeEvent.data);
      if (msg.type === 'ready') { setMapReady(true); setMapError(null); }
      if (msg.type === 'routeReady') { setNavigating(true); }
      if (msg.type === 'error') { setMapError(msg.message); }
      if (msg.type === 'instruction') {
        setCurrentStep(msg.message);
        const m: Record<string, string> = {
          TURN_RIGHT: 'turn-right', TURN_LEFT: 'turn-left',
          KEEP_RIGHT: 'arrow-top-right', KEEP_LEFT: 'arrow-top-left',
          U_TURN: 'u-turn-left', ROUNDABOUT_RIGHT: 'rotate-right',
          STRAIGHT: 'navigation', ARRIVE: 'flag-checkered',
        };
        setStepIcon(m[msg.maneuver] ?? 'navigation');
      }
      if (msg.type === 'log') console.log('[InAppNav]', msg.message);
    } catch {}
  }, []);

  const ETA = routeInfo ? formatTravelTime(routeInfo.travelTimeSeconds) : null;
  const DIST = routeInfo ? formatRouteDistance(routeInfo.distanceMeters) : null;

  return (
    <View style={ns.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Map */}
      {!mapError && (
        <WebView
          ref={wvRef}
          originWhitelist={['*']}
          mixedContentMode="always"
          source={{ html: navHtml, baseUrl: Platform.OS === 'web' ? undefined : 'https://localhost' }}
          onMessage={onMessage}
          style={ns.map}
          scrollEnabled={false}
          javaScriptEnabled
          domStorageEnabled
          onLoadEnd={() => {
            setTimeout(() => {
              wvRef.current?.injectJavaScript(`if(typeof window.pingReady==='function'){window.pingReady();}true;`);
            }, 2500);
          }}
        />
      )}

      {/* Map error */}
      {mapError && (
        <View style={ns.errorBox}>
          <MaterialCommunityIcons name="map-off" size={40} color="#F87171" />
          <Text style={ns.errorTitle}>Navigation Unavailable</Text>
          <Text style={ns.errorMsg}>{mapError}</Text>
        </View>
      )}

      {/* Loading overlay */}
      {!mapReady && !mapError && (
        <View style={ns.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={ns.loadingTxt}>Loading navigation…</Text>
        </View>
      )}

      {/* ── TOP: Back + Title ─── */}
      <View style={[ns.topBar, { top: insets.top + 8 }]}>
        <TouchableOpacity
          id="btn-stop-navigation"
          style={ns.closeBtn}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="close" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={ns.topTitle}>
          <Text style={ns.topTitleTxt} numberOfLines={1}>{stationName}</Text>
          {routeLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 8 }} />
          ) : ETA ? (
            <Text style={ns.topTitleSub}>{ETA} · {DIST}</Text>
          ) : null}
        </View>
      </View>

      {/* ── BOTTOM: Turn-by-turn panel ─── */}
      {navigating && (
        <Animated.View
          entering={SlideInUp.springify()}
          style={[ns.instructionPanel, { paddingBottom: insets.bottom + 12 }]}
        >
          {/* Step instruction */}
          <View style={ns.instrRow}>
            <View style={[ns.instrIcon, { backgroundColor: Colors.primary }]}>
              <MaterialCommunityIcons name={stepIcon} size={28} color="#FFF" />
            </View>
            <Text style={ns.instrTxt} numberOfLines={2}>{currentStep}</Text>
          </View>

          {/* Stats row */}
          {routeInfo && (
            <View style={ns.statsRow}>
              <View style={ns.statItem}>
                <MaterialCommunityIcons name="clock-outline" size={14} color={Colors.primary} />
                <Text style={ns.statVal}>{ETA}</Text>
                <Text style={ns.statLbl}>ETA</Text>
              </View>
              <View style={[ns.statDivider]} />
              <View style={ns.statItem}>
                <MaterialCommunityIcons name="road-variant" size={14} color={Colors.primary} />
                <Text style={ns.statVal}>{DIST}</Text>
                <Text style={ns.statLbl}>Distance</Text>
              </View>
              {routeInfo.trafficDelaySeconds > 30 && (
                <>
                  <View style={ns.statDivider} />
                  <View style={ns.statItem}>
                    <MaterialCommunityIcons name="car-brake-alert" size={14} color={Colors.warning} />
                    <Text style={[ns.statVal, { color: Colors.warning }]}>
                      +{formatTravelTime(routeInfo.trafficDelaySeconds)}
                    </Text>
                    <Text style={ns.statLbl}>Delay</Text>
                  </View>
                </>
              )}
            </View>
          )}
        </Animated.View>
      )}

      {/* Loading route panel */}
      {mapReady && !navigating && (
        <Animated.View
          entering={FadeIn}
          style={[ns.instructionPanel, ns.routeLoading, { paddingBottom: insets.bottom + 12 }]}
        >
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={ns.routeLoadingTxt}>Calculating route to {stationName}…</Text>
        </Animated.View>
      )}
    </View>
  );
}

const ns = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0F' },
  map: { flex: 1 },

  /* Top bar */
  topBar: {
    position: 'absolute',
    left: 16, right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
    ...Shadows.md,
  },
  topTitle: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: Radii.xl,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  topTitleTxt: {
    color: '#FFF', fontSize: FontSize.md, fontWeight: '800', letterSpacing: -0.3,
  },
  topTitleSub: {
    color: Colors.primary, fontSize: 12, fontWeight: '600', marginTop: 2,
  },

  /* Instruction panel */
  instructionPanel: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#0D0D15',
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    ...Shadows.xl,
  },
  instrRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: Spacing.lg,
  },
  instrIcon: {
    width: 56, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  instrTxt: {
    flex: 1, color: '#F8F8FC', fontSize: FontSize.xl, fontWeight: '800',
    letterSpacing: -0.5, lineHeight: 28,
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: Radii.lg, padding: Spacing.md,
    justifyContent: 'space-around',
    borderWidth: 1, borderColor: Colors.dark.cardBorder,
    marginBottom: Spacing.sm,
  },
  statItem: { alignItems: 'center', gap: 2, flex: 1 },
  statVal: { color: '#F8F8FC', fontSize: FontSize.md, fontWeight: '800' },
  statLbl: { color: Colors.dark.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.dark.border },

  /* Route loading state */
  routeLoading: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.xl, gap: Spacing.md,
  },
  routeLoadingTxt: {
    color: Colors.dark.textSecondary, fontSize: FontSize.md, fontStyle: 'italic', flex: 1,
  },

  /* Error */
  errorBox: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A0F',
    justifyContent: 'center', alignItems: 'center',
    padding: 32,
  },
  errorTitle: { color: '#F87171', fontSize: 20, fontWeight: '800', marginTop: 16 },
  errorMsg: { color: '#9898B0', fontSize: 14, textAlign: 'center', marginTop: 8 },

  /* Loading */
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A0F',
    justifyContent: 'center', alignItems: 'center',
    gap: 16,
  },
  loadingTxt: { color: Colors.dark.textSecondary, fontSize: FontSize.md, fontWeight: '600' },
});
