export default `

@group(0) @binding(0)
var inputTex : texture_2d<f32>;

@group(0) @binding(1)
var<storage, read_write> histogram : array<atomic<u32>>;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
    let size = textureDimensions(inputTex);
    if (gid.x >= size.x || gid.y >= size.y) {
        return;
    }

    let c = textureLoad(inputTex, vec2<i32>(gid.xy), 0);
    let y = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
    let bin = u32(clamp(y * 255.0, 0.0, 255.0));
    atomicAdd(&histogram[bin], 1u);
}

`