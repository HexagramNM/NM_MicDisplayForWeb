export default `

@group(0) @binding(0)
var inputTexture : texture_2d<f32>;

@group(0) @binding(1)
var smp : sampler;

@group(0) @binding(2)
var<uniform> canvasSize : vec2<f32>;

@fragment
fn main(@builtin(position) pos : vec4<f32>
    ) -> @location(0) vec4<f32> {
    
    let uv = pos.xy / canvasSize;
    return textureSample(inputTexture, smp, uv);
}

`