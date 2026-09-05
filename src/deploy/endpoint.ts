const HYPHEN_WEBSITE_REGIONS = new Set([
  "us-east-1",
  "us-west-1",
  "us-west-2",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "eu-west-1",
  "sa-east-1",
  "us-gov-west-1",
]);

export function websiteEndpoint(bucket: string, region: string): string {
  const host = HYPHEN_WEBSITE_REGIONS.has(region)
    ? `s3-website-${region}.amazonaws.com`
    : `s3-website.${region}.amazonaws.com`;

  return `http://${bucket}.${host}`;
}
