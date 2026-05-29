square = [
  [-7.5, -7.5],
  [7.5, -7.5],
  [7.5, 7.5],
  [-7.5, 7.5],
];

PolygonFace("room-a", floorTexture("grass1"), square);
PolygonFace("room-b", floorTexture("snow"), square);

Portal("room-a", 1, "room-b", 3);

room_a_house = small_house("room-a-house", {
  position: [0, 0, 0],
  scale: 0.9,
});

room_a_mouse = geo_mouse("room-a-geo-mouse", {
  position: [-4.6, 0, 1.4],
  turn: 74,
  speed: 2.8,
  oscillationRate: 1.5,
  oscillationMagnitude: 0.2,
});

room_a_bench = bench("room-a-bench", {
  position: [3.2, 0, -2.4],
  scale: 0.9,
  turn: -18,
});

room_b_tree = tree("room-b-tree", {
  position: [0, 0, 0],
});

room_b_bicycle = bicycle("room-b-bicycle", {
  position: [-3.4, 0, 2.2],
  scale: 0.85,
  turn: 36,
});

OnFace("room-a", [room_a_house, room_a_mouse, room_a_bench]);
OnFace("room-b", [room_b_tree, room_b_bicycle]);
