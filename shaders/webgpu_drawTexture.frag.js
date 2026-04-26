export default `

@group(0) @binding(0)
var inputTexture : texture_2d<f32>;

@group(0) @binding(1)
var smp : sampler;

@group(0) @binding(2)
var<uniform> canvasSize : vec2<f32>;

@group(0) @binding(3)
var<uniform> isMirror : u32;

@fragment
fn main(@builtin(position) pos : vec4<f32>
    ) -> @location(0) vec4<f32> {
    
    var uv = pos.xy / canvasSize;
    if (isMirror != 0u) {
        uv.x = 1.0 - uv.x;
    }

    return textureSample(inputTexture, smp, uv);
}

`