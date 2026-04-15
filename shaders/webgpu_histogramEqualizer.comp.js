export default `

@group(0) @binding(0)
var inputTex : texture_2d<f32>;

@group(0) @binding(1)
var<storage, read> cdf : array<u32>;

@group(0) @binding(2)
var outputTex : texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
    let size = textureDimensions(inputTex);
    if (gid.x >= size.x || gid.y >= size.y) {
        return;
    }

    let c = textureLoad(inputTex, vec2<i32>(gid.xy), 0);
    let y = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
    let u = -0.169 * c.r - 0.331 * c.g + 0.5 * c.b;
    let v = 0.5 * c.r - 0.419 * c.g - 0.081 * c.b;
    let bin = u32(clamp(y * 255.0, 0.0, 255.0));
    let equalizedY = f32(cdf[bin]) / f32(cdf[255]);
    
    var newR = clamp(equalizedY + 1.402 * v, 0.0, 1.0);
    var newG = clamp(equalizedY - 0.344 * u - 0.714 * v, 0.0, 1.0);
    var newB = clamp(equalizedY + 1.772 * u, 0.0, 1.0);
    textureStore(outputTex, vec2<i32>(gid.xy), vec4<f32>(newR, newG, newB, c.a));
}

`