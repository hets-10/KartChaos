export type TrackId = 'sunset' | 'canyon' | 'aurora';
export type Track = {
  id: TrackId; name: string; subtitle: string; length: number; difficulty: string;
  points: [number, number, number][];
  sky: string; ground: string; water: string; sand: string; road: string; accent: string;
};
export const tracks: Track[] = [
  {id:'sunset',name:'Sunset Circuit',subtitle:'Wide curves, sea breeze, room to learn.',length:1160,difficulty:'Easy · 2 min',sky:'#91d9e8',ground:'#74ba77',water:'#40bacc',sand:'#f2d393',road:'#495b70',accent:'#ef705c',points:[[0,4,-165],[125,7,-140],[180,12,-50],[135,10,40],[180,4,130],[55,3,180],[-80,8,130],[-175,15,55],[-135,7,-45],[-150,3,-145]]},
  {id:'canyon',name:'Copper Canyon',subtitle:'Tight switchbacks through warm red rock.',length:1320,difficulty:'Technical · 2½ min',sky:'#e9b38b',ground:'#ba7956',water:'#b75842',sand:'#dfac70',road:'#61505a',accent:'#ffc365',points:[[0,5,-180],[130,8,-165],[185,12,-85],[80,18,-55],[105,25,20],[190,12,90],[115,4,170],[5,4,135],[-105,10,175],[-185,18,100],[-90,25,20],[-165,9,-80],[-120,4,-175]]},
  {id:'aurora',name:'Aurora Run',subtitle:'Long boost straights under a violet sky.',length:1050,difficulty:'Fast · 1¾ min',sky:'#34385e',ground:'#83a8bd',water:'#284a76',sand:'#c4e6e8',road:'#36455f',accent:'#72efd4',points:[[0,8,-180],[155,8,-160],[185,12,-70],[155,20,15],[185,8,125],[95,4,175],[-30,8,125],[-175,14,155],[-180,8,35],[-140,5,-60],[-155,4,-160]]},
];
export const getTrack=(id:TrackId)=>tracks.find(t=>t.id===id)??tracks[0];
