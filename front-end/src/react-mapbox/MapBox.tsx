/*
 * @Author: Antoine YANG 
 * @Date: 2020-01-16 22:19:20 
 * @Last Modified by: Antoine YANG
 * @Last Modified time: 2020-02-08 15:53:02
 */

import React, {Component} from 'react';
import $ from 'jquery';
import mapboxgl from 'mapbox-gl';
import './MapBox.css';


export interface MapProps {
    accessToken: string;
    styleURL?: string;
    containerID: string;
    center: [number, number];
    zoom: number;
    minZoom?: number;
    maxZoom?: number;
    bounds?: [[number, number], [number, number]];
    pitch?: number;
    bearing?: number;
    onDragEnd: (bounds: [[number, number], [number, number]]) => void | null | undefined;
    onZoomEnd: (bounds: [[number, number], [number, number]]) => void | null | undefined;
    allowInteraction: boolean;
}


class MapBox extends Component<MapProps, {}, {}> {
    private map?: mapboxgl.Map | null;
    private loaded: boolean;
    private heatmap: boolean;

    public constructor(props: MapProps) {
        super(props);
        this.map = null;
        this.loaded = false;
        this.heatmap = false;
    }

    public render(): JSX.Element {
        return (
            <></>
        )
    }

    public componentDidMount(): void {
        mapboxgl.accessToken = this.props.accessToken;

        this.map = new mapboxgl.Map({
            attributionControl: false,
            bearing: this.props.bearing ? this.props.bearing : 0,
            center: [this.props.center[0], this.props.center[1]],
            container: this.props.containerID,
            dragRotate: false,
            interactive: this.props.allowInteraction,
            maxBounds: this.props.bounds,
            maxZoom: this.props.maxZoom ? this.props.maxZoom : this.props.zoom + 3,
            minZoom: this.props.minZoom ? this.props.minZoom : this.props.zoom - 3,
            pitch: this.props.pitch ? this.props.pitch : 0,
            pitchWithRotate: false,
            refreshExpiredTiles: false,
            style: this.props.styleURL ? this.props.styleURL : 'mapbox://styles/mapbox/streets-v10',
            zoom: this.props.zoom
        });

        this.map.on('load', () => {
            this.loaded = true;
            $('.mapboxgl-canvas').css('opacity', '0.5').css('position', 'relative');
            this.props.onDragEnd([
                [this.map!.getBounds().getNorth(), this.map!.getBounds().getSouth()],
                [this.map!.getBounds().getWest(), this.map!.getBounds().getEast()]
            ]);
            
            this.map!.on('zoomend', () => {
                this.props.onZoomEnd([
                    [this.map!.getBounds().getNorth(), this.map!.getBounds().getSouth()],
                    [this.map!.getBounds().getWest(), this.map!.getBounds().getEast()]
                ]);
            })
            .on('dragend', () => {
                this.props.onDragEnd([
                    [this.map!.getBounds().getNorth(), this.map!.getBounds().getSouth()],
                    [this.map!.getBounds().getWest(), this.map!.getBounds().getEast()]
                ]);
            });
        });
    }

    public getBounds(): mapboxgl.LngLatBounds {
        return this.map!.getBounds();
    }

    public fitBounds(target: MapBox): void {
        if (this.map && target) {
            this.map.fitBounds(target.getBounds());
        }
    }

    public updateHeatMap(points: Array<[number, number]>): void {
        if (!this.loaded || (!this.map!.getSource("heatmap"))) {
            if (this.loaded && !this.heatmap) {
                this.callHeatMap();
            }
            setTimeout(() => {
                this.updateHeatMap(points);
            }, 400);
            return;
        }
        let data: any = [];
        points.forEach((p: [number, number]) => {
            data.push({
                "type": "Feature",
                "properties": {
                    "mag": 1
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [ p[0], p[1], 0.0 ]
                }
            });
        });
        
        (this.map!.getSource("heatmap") as mapboxgl.GeoJSONSource).setData({
            "type": "FeatureCollection",
            "features": data
        });
    }

    public callHeatMap(): void {
        if (!this.loaded) {
            setTimeout(this.callHeatMap, 400);
            return;
        }
        if (!this.heatmap) {
            this.map!.addSource("heatmap", { type: "geojson", data: {
                "type": "FeatureCollection",
                "features": []
            } });
            this.map!.addLayer({
                id: "heatmapLayer",
                source: "heatmap",
                type: "heatmap",
                // maxzoom: 9,
                paint: {
                  // Increase the heatmap weight based on frequency and property magnitude
                  "heatmap-weight": [
                    "interpolate", ["linear"],
                    ["get", "mag"],
                    0, 0,
                    5, 0.2,
                    100, 0.6,
                    5000, 0.7,
                    25000, 1
                  ],
                  // Increase the heatmap color weight weight by zoom level
                  // heatmap-intensity is a multiplier on top of heatmap-weight
                  "heatmap-intensity": [
                    "interpolate", ["linear"],
                    ["zoom"],
                    0, 1,
                    10, 3,
                  ],
                  // Color ramp for heatmap.  Domain is 0 (low) to 1 (high).
                  // Begin color ramp at 0-stop with a 0-transparancy color
                  // to create a blur-like effect.
                  "heatmap-color": [
                    "interpolate", ["linear"],
                    ["heatmap-density"],
                    0, 'rgba(34,125,81,0)',
                    0.2, 'rgba(129,199,212,0.46)',
                    0.4, 'rgba(102,186,183,0.54)',
                    0.6, 'rgba(66,90,74,0.63)',
                    0.8, 'rgba(255,196,8,0.72)',
                    1, 'rgba(208,16,76,0.8)',
                  ],
                  // Adjust the heatmap radius by zoom level
                  "heatmap-radius": [
                    "interpolate", ["linear"],
                    ["zoom"],
                    0, 39,
                    100, 28,
                    5000, 20,
                    10000, 14,
                    500000, 10
                  ],
                  // Transition from heatmap to circle layer by zoom level
                  "heatmap-opacity": [
                    "interpolate", ["linear"],
                    ["zoom"],
                    7, 1,
                    9, 0.2,
                  ],
                },
              });
            this.heatmap = true;
            this.callHeatMap();
        }
    }
}


export default MapBox;
