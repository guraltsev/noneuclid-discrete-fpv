square = [
  [-7.5, -7.5],
  [7.5, -7.5],
  [7.5, 7.5],
  [-7.5, 7.5],
];

PolygonFace("torus-room", "#4fb8c7", square);

Portal("torus-room", 0, "torus-room", 2);
Portal("torus-room", 1, "torus-room", 3);

torus_clock = clock("torus-center-clock", {
  position: [0, 0, 0],
  scale: 2,
});

torus_marmot = geodesic_marmot("torus-geodesci-marmot", {
  position: [-4.4, 0, 1.1],
  scale: 1.05,
  velocity: [2.5, 0.9],
});

OnFace("torus-room", [torus_clock, torus_marmot]);
