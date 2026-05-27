square = [
  [-7.5, -7.5],
  [7.5, -7.5],
  [7.5, 7.5],
  [-7.5, 7.5],
];

PolygonFace("room-a", "#d95f5f", square);
PolygonFace("room-b", "#5f79d9", square);

Portal("room-a", 1, "room-b", 3);

room_a_house = house("room-a-house", {
  position: [0, 0, 0],
  scale: 3,
});

room_a_marmot = geodesic_marmot("room-a-geodesci-marmot", {
  position: [-4.6, 0, 1.4],
  scale: 1.05,
  velocity: [2.7, 0.8],
});

room_b_clock = clock("room-b-clock", {
  position: [0, 0, 0],
  scale: 2,
});

OnFace("room-a", [room_a_house, room_a_marmot]);
OnFace("room-b", [room_b_clock]);
