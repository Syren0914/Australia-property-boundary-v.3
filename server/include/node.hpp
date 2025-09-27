#pragma once

public class Node {
	private:
		AABB box;
		Node* child_begin;
		Node* child_end;
		AABB* prop_begin;
		AABB* prop_end;

	public:
		static void build_tree(int threads);

		Node(AABB* begin, AABB* end, int threads);
		~Node();

		void cam_location(double lon, double lat, double zoom);
};
